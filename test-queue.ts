#!/usr/bin/env tsx
/**
 * Queue System End-to-End Test
 *
 * Tests the LinkedIn queue system without actually posting to LinkedIn.
 *
 * Usage:
 *   npx tsx test-queue.ts
 */

import { MemoryQueueStorage, createQueueProcessor } from './src/lib/linkedin/queue.js';

async function testQueueSystem() {
  console.log('='.repeat(60));
  console.log('LinkedIn Queue System Test');
  console.log('='.repeat(60));
  console.log('');

  const storage = new MemoryQueueStorage();
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ ${message}`);
      testsPassed++;
    } else {
      console.error(`✗ ${message}`);
      testsFailed++;
    }
  }

  try {
    // Test 1: Add post to queue
    console.log('\n[Test 1] Add post to queue');
    console.log('-'.repeat(60));

    const post1 = await storage.addToQueue({
      articleSlug: 'test-article-1',
      text: 'This is a test LinkedIn post #1',
      visibility: 'PUBLIC',
      status: 'pending',
      maxAttempts: 3,
    });

    assert(post1.id !== undefined, 'Post has ID');
    assert(post1.status === 'pending', 'Post status is pending');
    assert(post1.attempts === 0, 'Post attempts is 0');
    assert(post1.articleSlug === 'test-article-1', 'Article slug matches');

    // Test 2: Add scheduled post
    console.log('\n[Test 2] Add scheduled post');
    console.log('-'.repeat(60));

    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const post2 = await storage.addToQueue({
      articleSlug: 'test-article-2',
      text: 'This is a scheduled test post #2',
      visibility: 'PUBLIC',
      status: 'pending',
      scheduledTime: futureTime,
      maxAttempts: 3,
    });

    assert(post2.scheduledTime === futureTime, 'Scheduled time set correctly');

    // Test 3: Get queue
    console.log('\n[Test 3] Get queue');
    console.log('-'.repeat(60));

    const queue = await storage.getQueue();
    assert(queue.length === 2, `Queue has 2 posts (got ${queue.length})`);
    assert(queue[0].id === post1.id, 'First post is post1');
    assert(queue[1].id === post2.id, 'Second post is post2');

    // Test 4: Get pending posts
    console.log('\n[Test 4] Get pending posts');
    console.log('-'.repeat(60));

    const pending = await storage.getPendingPosts();
    assert(pending.length === 2, `2 pending posts (got ${pending.length})`);

    // Test 5: Update post
    console.log('\n[Test 5] Update post');
    console.log('-'.repeat(60));

    const updatedPost = await storage.updateQueuedPost(post1.id, {
      status: 'processing',
      attempts: 1,
    });

    assert(updatedPost.status === 'processing', 'Status updated to processing');
    assert(updatedPost.attempts === 1, 'Attempts incremented');

    // Test 6: Get scheduled posts
    console.log('\n[Test 6] Get scheduled posts');
    console.log('-'.repeat(60));

    // Add a post scheduled for the past
    const pastTime = new Date(Date.now() - 1000).toISOString();
    const post3 = await storage.addToQueue({
      articleSlug: 'test-article-3',
      text: 'This post should be due',
      visibility: 'PUBLIC',
      status: 'pending',
      scheduledTime: pastTime,
      maxAttempts: 3,
    });

    const scheduledPosts = await storage.getScheduledPosts(new Date());
    assert(scheduledPosts.length === 1, `1 due post (got ${scheduledPosts.length})`);
    assert(scheduledPosts[0].id === post3.id, 'Due post is post3');

    // Test 7: Queue processor
    console.log('\n[Test 7] Queue processor');
    console.log('-'.repeat(60));

    let postCallCount = 0;
    const mockPostFunction = async (text: string, visibility: 'PUBLIC' | 'CONNECTIONS') => {
      postCallCount++;
      console.log(`  Mock post called: "${text.substring(0, 30)}..."`);
      return { id: `mock-linkedin-${postCallCount}` };
    };

    const processor = createQueueProcessor(storage, mockPostFunction);

    const result = await processor.processScheduledPosts();
    assert(result.processed === 1, `Processed 1 post (got ${result.processed})`);
    assert(result.succeeded === 1, `Succeeded 1 post (got ${result.succeeded})`);
    assert(result.failed === 0, `Failed 0 posts (got ${result.failed})`);
    assert(postCallCount === 1, `Mock post function called once (got ${postCallCount})`);

    // Verify post3 was marked as posted
    const post3Updated = await storage.getQueuedPost(post3.id);
    assert(post3Updated?.status === 'posted', 'Post3 marked as posted');
    assert(post3Updated?.postedId !== undefined, 'Post3 has LinkedIn ID');

    // Test 8: Failed post retry
    console.log('\n[Test 8] Failed post retry');
    console.log('-'.repeat(60));

    // Add a post and simulate failure
    const post4 = await storage.addToQueue({
      articleSlug: 'test-article-4',
      text: 'This will fail',
      visibility: 'PUBLIC',
      status: 'pending',
      scheduledTime: pastTime,
      maxAttempts: 2,
    });

    const mockFailFunction = async () => {
      throw new Error('Mock posting error');
    };

    const failProcessor = createQueueProcessor(storage, mockFailFunction);

    try {
      await failProcessor.processPost(post4);
    } catch (error) {
      // Expected to fail
    }

    const post4AfterFail = await storage.getQueuedPost(post4.id);
    assert(post4AfterFail?.status === 'pending', 'Post4 still pending after first failure');
    assert(post4AfterFail?.attempts === 1, 'Post4 attempts incremented');
    assert(post4AfterFail?.lastError !== undefined, 'Post4 has error message');

    // Fail again (should exceed maxAttempts)
    try {
      await failProcessor.processPost(post4AfterFail!);
    } catch (error) {
      // Expected to fail
    }

    const post4Final = await storage.getQueuedPost(post4.id);
    assert(post4Final?.status === 'failed', 'Post4 marked as failed after max attempts');
    assert(post4Final?.attempts === 2, 'Post4 attempts is 2');

    // Test 9: Get failed posts
    console.log('\n[Test 9] Get failed posts');
    console.log('-'.repeat(60));

    const failedPosts = await storage.getFailedPosts();
    assert(failedPosts.length === 1, `1 failed post (got ${failedPosts.length})`);
    assert(failedPosts[0].id === post4.id, 'Failed post is post4');

    // Test 10: Remove from queue
    console.log('\n[Test 10] Remove from queue');
    console.log('-'.repeat(60));

    await storage.removeFromQueue(post1.id);
    const queueAfterDelete = await storage.getQueue();
    const post1Exists = queueAfterDelete.some((p) => p.id === post1.id);
    assert(!post1Exists, 'Post1 removed from queue');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`✓ Passed: ${testsPassed}`);
    console.log(`✗ Failed: ${testsFailed}`);
    console.log(`Total: ${testsPassed + testsFailed}`);

    if (testsFailed === 0) {
      console.log('\n🎉 All tests passed!');
      console.log('');
      console.log('Queue system is working correctly.');
      console.log('You can now use the admin dashboard at /admin/linkedin');
      return 0;
    } else {
      console.log('\n❌ Some tests failed.');
      return 1;
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:');
    console.error(error);
    return 1;
  }
}

testQueueSystem()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
