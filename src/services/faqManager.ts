import { FAQQuestion, ProductType } from '../types';
import { getFAQsByProduct } from '../data/faqData';

/**
 * Manager for handling FAQ tracking and randomization
 */
export class FAQManager {
  // Track asked questions per user per product
  // Map<userId, Map<product, Set<faqId>>>
  private userHistory: Map<string, Map<ProductType, Set<string>>> = new Map();

  /**
   * Get random unasked FAQs for user
   * @param userId - User ID
   * @param product - Product type
   * @param count - Number of FAQs to return (default 3)
   * @returns Array of random unasked FAQs
   */
  getRandomFAQs(userId: string, product: ProductType, count: number = 3): FAQQuestion[] {
    const allFAQs = getFAQsByProduct(product);
    const askedFAQs = this.getAskedFAQs(userId, product);

    // Filter unasked FAQs
    let available = allFAQs.filter(faq => !askedFAQs.has(faq.id));

    // If not enough unasked FAQs, reset history for this product
    if (available.length < count) {
      console.log(`[FAQ] User ${userId} - ${product}: Exhausted FAQs, resetting history`);
      this.resetHistory(userId, product);
      available = allFAQs;
    }

    // Shuffle and return requested count
    return this.shuffle(available).slice(0, count);
  }

  /**
   * Mark FAQ as asked by user
   */
  markAsAsked(userId: string, product: ProductType, faqId: string): void {
    if (!this.userHistory.has(userId)) {
      this.userHistory.set(userId, new Map());
    }

    const userProducts = this.userHistory.get(userId)!;
    if (!userProducts.has(product)) {
      userProducts.set(product, new Set());
    }

    userProducts.get(product)!.add(faqId);
    console.log(`[FAQ] User ${userId} - ${product}: Marked "${faqId}" as asked`);
  }

  /**
   * Get set of asked FAQ IDs for user and product
   */
  private getAskedFAQs(userId: string, product: ProductType): Set<string> {
    const userProducts = this.userHistory.get(userId);
    if (!userProducts) return new Set();

    return userProducts.get(product) || new Set();
  }

  /**
   * Reset FAQ history for user and product
   */
  resetHistory(userId: string, product: ProductType): void {
    const userProducts = this.userHistory.get(userId);
    if (userProducts) {
      userProducts.delete(product);
    }
  }

  /**
   * Reset all FAQ history for user
   */
  resetAllHistory(userId: string): void {
    this.userHistory.delete(userId);
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get FAQ statistics for debugging
   */
  getStats(userId: string, product: ProductType): {
    total: number;
    asked: number;
    remaining: number;
  } {
    const allFAQs = getFAQsByProduct(product);
    const askedFAQs = this.getAskedFAQs(userId, product);

    return {
      total: allFAQs.length,
      asked: askedFAQs.size,
      remaining: allFAQs.length - askedFAQs.size
    };
  }

  /**
   * Cleanup expired user histories (optional, can be called periodically)
   * For now, we keep all history in memory
   */
  cleanup(): void {
    // Could implement TTL-based cleanup if needed
    // For now, history persists for server lifetime
  }
}
