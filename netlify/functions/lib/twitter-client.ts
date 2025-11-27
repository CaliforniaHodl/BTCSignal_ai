import { TwitterApi } from 'twitter-api-v2';

export interface ThreadTweet {
  id: string;
  text: string;
}

export class TwitterClient {
  private client: TwitterApi;

  constructor() {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });

    this.client = client;
  }

  async tweet(text: string): Promise<{ id: string; text: string }> {
    const result = await this.client.v2.tweet(text);
    return {
      id: result.data.id,
      text: result.data.text,
    };
  }

  /**
   * Post a thread of tweets
   * @param tweets Array of tweet texts to post as a thread
   * @returns Array of posted tweet results
   */
  async postThread(tweets: string[]): Promise<ThreadTweet[]> {
    if (tweets.length === 0) {
      throw new Error('Thread must contain at least one tweet');
    }

    const results: ThreadTweet[] = [];
    let previousTweetId: string | null = null;

    for (const tweetText of tweets) {
      const options: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
        text: tweetText,
      };

      if (previousTweetId) {
        options.reply = { in_reply_to_tweet_id: previousTweetId };
      }

      const result = await this.client.v2.tweet(options);
      previousTweetId = result.data.id;

      results.push({
        id: result.data.id,
        text: result.data.text,
      });
    }

    return results;
  }
}
