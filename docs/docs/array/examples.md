---
sidebar_position: 3
---

# Examples

Real-world examples demonstrating how to use array utilities in practical scenarios.

## Table of Contents

- [Data Processing](#data-processing)
- [E-commerce](#e-commerce)
- [Analytics & Reporting](#analytics--reporting)
- [User Management](#user-management)
- [Data Validation](#data-validation)
- [API Response Processing](#api-response-processing)
- [Financial Calculations](#financial-calculations)
- [Gaming & Leaderboards](#gaming--leaderboards)

## Data Processing

### CSV Data Import and Cleanup

```typescript
import { 
  chunk, 
  filterCompact, 
  unique, 
  groupBy 
} from '@fluixi/utils/array/advanced';

// Import and process CSV data
async function processCSVData(csvData: string) {
  // Parse CSV rows
  const rows = csvData.split('\n').map(row => row.split(','));
  
  // Remove empty rows and invalid entries
  const validRows = filterCompact(rows, row => 
    row.length === 3 && row.every(cell => cell.trim())
  );
  
  // Convert to objects
  const data = validRows.map(([id, name, category]) => ({
    id: parseInt(id),
    name: name.trim(),
    category: category.trim()
  }));
  
  // Remove duplicates by ID
  const uniqueData = unique(data, 'id');
  
  // Group by category for organized import
  const grouped = groupBy(uniqueData, 'category');
  
  // Process each category in batches
  for (const [category, items] of Object.entries(grouped)) {
    await batchProcess(items, 100, async (batch) => {
      await importToDatabase(category, batch);
    });
  }
  
  return uniqueData;
}
```

### Data Deduplication Pipeline

```typescript
import { 
  unique, 
  sortBy, 
  groupBy, 
  mergeByKey 
} from '@fluixi/utils/array/advanced';

interface Contact {
  email: string;
  name: string;
  phone?: string;
  source: string;
  createdAt: Date;
}

function deduplicateContacts(contacts: Contact[]): Contact[] {
  // Step 1: Remove exact duplicates
  const withoutExact = unique(contacts, contact => 
    `${contact.email}-${contact.name}`
  );
  
  // Step 2: Group by email to find potential duplicates
  const byEmail = groupBy(withoutExact, 'email');
  
  // Step 3: Merge contacts with same email
  const merged = Object.values(byEmail).map(group => {
    if (group.length === 1) return group[0];
    
    // Keep the most recent one and merge data
    const sorted = sortBy(group, [{ key: 'createdAt', dir: 'desc' }]);
    return {
      ...sorted[0],
      phone: sorted.find(c => c.phone)?.phone,
      source: unique(group, 'source').map(c => c.source).join(', ')
    };
  });
  
  return merged;
}
```

## E-commerce

### Product Catalog Management

```typescript
import { 
  sortBy, 
  groupBy, 
  filterCompact, 
  sumBy, 
  avgBy 
} from '@fluixi/utils/array/advanced';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
  reviews: number;
}

class ProductCatalog {
  constructor(private products: Product[]) {}
  
  // Get featured products (high rating, in stock)
  getFeaturedProducts(limit = 10) {
    return sortBy(
      filterCompact(this.products, p => p.stock > 0 && p.rating >= 4),
      [{ key: 'rating', dir: 'desc' }, { key: 'reviews', dir: 'desc' }]
    ).slice(0, limit);
  }
  
  // Get products by category with stats
  getCategoryStats() {
    const byCategory = groupBy(this.products, 'category');
    
    return Object.entries(byCategory).map(([category, products]) => ({
      category,
      count: products.length,
      avgPrice: avgBy(products, 'price'),
      totalValue: sumBy(products, p => p.price * p.stock),
      avgRating: avgBy(products, 'rating'),
      inStock: products.filter(p => p.stock > 0).length
    }));
  }
  
  // Get low stock alerts
  getLowStockAlerts(threshold = 10) {
    return sortBy(
      filterCompact(this.products, p => p.stock > 0 && p.stock <= threshold),
      'stock'
    );
  }
  
  // Price range analysis
  getPriceRanges() {
    return groupBy(this.products, p => {
      if (p.price < 20) return 'budget';
      if (p.price < 50) return 'mid-range';
      return 'premium';
    });
  }
}
```

### Shopping Cart Optimization

```typescript
import { 
  groupBy, 
  sumBy, 
  sortBy, 
  unique 
} from '@fluixi/utils/array/advanced';

interface CartItem {
  productId: number;
  quantity: number;
  price: number;
  category: string;
  discount?: number;
}

function optimizeCart(items: CartItem[]) {
  // Group items by category for bundle discounts
  const byCategory = groupBy(items, 'category');
  
  // Apply category-based discounts
  const withDiscounts = Object.entries(byCategory).flatMap(([category, categoryItems]) => {
    const categoryTotal = sumBy(categoryItems, i => i.price * i.quantity);
    
    // Apply discount if category total > $100
    if (categoryTotal > 100) {
      return categoryItems.map(item => ({
        ...item,
        discount: (item.discount || 0) + 0.1 // Additional 10% off
      }));
    }
    
    return categoryItems;
  });
  
  // Calculate totals
  const subtotal = sumBy(withDiscounts, i => i.price * i.quantity);
  const discountAmount = sumBy(withDiscounts, i => 
    (i.price * i.quantity) * (i.discount || 0)
  );
  
  return {
    items: sortBy(withDiscounts, 'category'),
    subtotal,
    discount: discountAmount,
    total: subtotal - discountAmount,
    uniqueCategories: unique(items, 'category').length
  };
}
```

## Analytics & Reporting

### Sales Dashboard Data

```typescript
import { 
  groupBy, 
  sumBy, 
  avgBy, 
  percentile,
  standardDeviation,
  sortBy,
  take
} from '@fluixi/utils/array/advanced';

interface Sale {
  id: number;
  date: Date;
  amount: number;
  rep: string;
  region: string;
  product: string;
}

class SalesAnalytics {
  constructor(private sales: Sale[]) {}
  
  // Regional performance
  getRegionalPerformance() {
    const byRegion = groupBy(this.sales, 'region');
    
    return Object.entries(byRegion).map(([region, sales]) => {
      const amounts = sales.map(s => s.amount);
      
      return {
        region,
        totalSales: sumBy(sales, 'amount'),
        avgSale: avgBy(sales, 'amount'),
        salesCount: sales.length,
        median: percentile(amounts, 50),
        top25Percentile: percentile(amounts, 75),
        stdDev: standardDeviation(amounts)
      };
    });
  }
  
  // Top performers
  getTopPerformers(limit = 10) {
    const byRep = groupBy(this.sales, 'rep');
    
    const repStats = Object.entries(byRep).map(([rep, sales]) => ({
      rep,
      totalSales: sumBy(sales, 'amount'),
      salesCount: sales.length,
      avgSale: avgBy(sales, 'amount')
    }));
    
    return take(sortBy(repStats, [{ key: 'totalSales', dir: 'desc' }]), limit);
  }
  
  // Product performance trends
  getProductTrends() {
    const byProduct = groupBy(this.sales, 'product');
    
    return sortBy(
      Object.entries(byProduct).map(([product, sales]) => ({
        product,
        totalSales: sumBy(sales, 'amount'),
        unitsSold: sales.length,
        avgPrice: avgBy(sales, 'amount'),
        growth: this.calculateGrowth(sales)
      })),
      [{ key: 'totalSales', dir: 'desc' }]
    );
  }
  
  private calculateGrowth(sales: Sale[]) {
    const sorted = sortBy(sales, 'date');
    const firstHalf = take(sorted, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvg = avgBy(firstHalf, 'amount');
    const secondAvg = avgBy(secondHalf, 'amount');
    
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }
}
```

### Time Series Analysis

```typescript
import { 
  groupBy, 
  sortBy, 
  cumulativeSum,
  diff,
  slidingWindow,
  avgBy
} from '@fluixi/utils/array/advanced';

interface DataPoint {
  timestamp: Date;
  value: number;
}

function analyzeTimeSeries(data: DataPoint[]) {
  // Sort by time
  const sorted = sortBy(data, 'timestamp');
  const values = sorted.map(d => d.value);
  
  // Calculate moving average (7-day window)
  const windows = slidingWindow(values, 7);
  const movingAvg = windows.map(window => 
    window.reduce((sum, v) => sum + v, 0) / window.length
  );
  
  // Calculate daily changes
  const changes = diff(values);
  
  // Calculate cumulative total
  const cumulative = cumulativeSum(values);
  
  return {
    data: sorted,
    movingAverage: movingAvg,
    dailyChanges: changes,
    cumulative: cumulative,
    stats: {
      total: cumulative[cumulative.length - 1],
      avgChange: changes.reduce((a, b) => a + b, 0) / changes.length,
      maxChange: Math.max(...changes),
      minChange: Math.min(...changes)
    }
  };
}
```

## User Management

### User Segmentation

```typescript
import { 
  groupBy, 
  partition, 
  sortBy, 
  percentile,
  avgBy
} from '@fluixi/utils/array/advanced';

interface User {
  id: number;
  name: string;
  email: string;
  signupDate: Date;
  lastActive: Date;
  purchaseCount: number;
  totalSpent: number;
  subscription: 'free' | 'basic' | 'premium';
}

class UserSegmentation {
  constructor(private users: User[]) {}
  
  // RFM Analysis (Recency, Frequency, Monetary)
  getRFMSegments() {
    const now = new Date();
    
    // Calculate RFM scores
    const withScores = this.users.map(user => {
      const daysSinceActive = Math.floor(
        (now.getTime() - user.lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        ...user,
        recency: daysSinceActive,
        frequency: user.purchaseCount,
        monetary: user.totalSpent
      };
    });
    
    // Calculate percentiles for scoring
    const recencyP50 = percentile(withScores.map(u => u.recency), 50);
    const frequencyP50 = percentile(withScores.map(u => u.frequency), 50);
    const monetaryP50 = percentile(withScores.map(u => u.monetary), 50);
    
    // Segment users
    return groupBy(withScores, user => {
      const r = user.recency < recencyP50 ? 'H' : 'L';
      const f = user.frequency > frequencyP50 ? 'H' : 'L';
      const m = user.monetary > monetaryP50 ? 'H' : 'L';
      
      if (r === 'H' && f === 'H' && m === 'H') return 'Champions';
      if (r === 'H' && f === 'H') return 'Loyal Customers';
      if (r === 'H' && m === 'H') return 'Big Spenders';
      if (r === 'L' && f === 'H') return 'At Risk';
      if (r === 'L') return 'Lost';
      return 'Potential';
    });
  }
  
  // Churn risk analysis
  getChurnRisk() {
    const [active, inactive] = partition(this.users, user => {
      const daysSinceActive = Math.floor(
        (Date.now() - user.lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceActive < 30;
    });
    
    return {
      active: {
        count: active.length,
        avgPurchases: avgBy(active, 'purchaseCount'),
        avgSpent: avgBy(active, 'totalSpent')
      },
      inactive: {
        count: inactive.length,
        avgPurchases: avgBy(inactive, 'purchaseCount'),
        avgSpent: avgBy(inactive, 'totalSpent')
      },
      churnRate: (inactive.length / this.users.length) * 100
    };
  }
}
```

### Permission Management

```typescript
import { 
  intersection, 
  union, 
  difference,
  unique,
  flatten
} from '@fluixi/utils/array/advanced';

interface User {
  id: number;
  roles: string[];
  permissions: string[];
}

interface Role {
  name: string;
  permissions: string[];
}

class PermissionManager {
  constructor(private roles: Role[]) {}
  
  // Calculate effective permissions for user
  getEffectivePermissions(user: User): string[] {
    // Get permissions from roles
    const rolePermissions = flatten(
      user.roles
        .map(roleName => this.roles.find(r => r.name === roleName))
        .filter(Boolean)
        .map(role => role!.permissions)
    );
    
    // Combine with direct permissions
    return unique(union(rolePermissions, user.permissions));
  }
  
  // Check if user has specific permissions
  hasPermissions(user: User, required: string[]): boolean {
    const userPerms = this.getEffectivePermissions(user);
    return intersection(userPerms, required).length === required.length;
  }
  
  // Find users with specific permission
  findUsersWithPermission(users: User[], permission: string): User[] {
    return users.filter(user => {
      const perms = this.getEffectivePermissions(user);
      return perms.includes(permission);
    });
  }
  
  // Get missing permissions
  getMissingPermissions(user: User, required: string[]): string[] {
    const userPerms = this.getEffectivePermissions(user);
    return difference(required, userPerms);
  }
}
```

## Data Validation

### Form Validation with Arrays

```typescript
import { 
  filterCompact, 
  unique, 
  findIndex,
  partition
} from '@fluixi/utils/array/advanced';

interface ValidationRule<T> {
  field: keyof T;
  validate: (value: any) => boolean;
  message: string;
}

interface ValidationError {
  field: string;
  message: string;
}

class FormValidator<T extends Record<string, any>> {
  constructor(private rules: ValidationRule<T>[]) {}
  
  validate(data: T): { isValid: boolean; errors: ValidationError[] } {
    const errors = filterCompact(
      this.rules.map(rule => {
        const value = data[rule.field];
        if (!rule.validate(value)) {
          return {
            field: String(rule.field),
            message: rule.message
          };
        }
        return null;
      })
    );
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  validateBatch(items: T[]): { valid: T[]; invalid: Array<{ item: T; errors: ValidationError[] }> } {
    const [valid, invalid] = partition(items, item => {
      const result = this.validate(item);
      return result.isValid;
    });
    
    const invalidWithErrors = invalid.map(item => ({
      item,
      errors: this.validate(item).errors
    }));
    
    return { valid, invalid: invalidWithErrors };
  }
}

// Usage
interface UserForm {
  email: string;
  age: number;
  username: string;
}

const validator = new FormValidator<UserForm>([
  {
    field: 'email',
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: 'Invalid email format'
  },
  {
    field: 'age',
    validate: (v) => v >= 18 && v <= 120,
    message: 'Age must be between 18 and 120'
  },
  {
    field: 'username',
    validate: (v) => v.length >= 3 && v.length <= 20,
    message: 'Username must be 3-20 characters'
  }
]);
```

## API Response Processing

### Paginated API Data Fetching

```typescript
import { 
  flatten, 
  unique, 
  mergeByKey,
  batchProcessParallel
} from '@fluixi/utils/array/advanced';

interface APIResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
}

async function fetchAllPages<T extends { id: number }>(
  fetchFn: (page: number) => Promise<APIResponse<T>>
): Promise<T[]> {
  // Fetch first page to get total
  const firstPage = await fetchFn(1);
  
  // Generate page numbers
  const pages = Array.from(
    { length: firstPage.totalPages }, 
    (_, i) => i + 1
  );
  
  // Fetch remaining pages in parallel (5 at a time)
  const allResponses = await batchProcessParallel(
    pages,
    1,
    5,
    async (batch) => {
      const responses = await Promise.all(
        batch.map(page => fetchFn(page))
      );
      return responses;
    }
  );
  
  // Flatten and deduplicate
  const allData = flatten(flatten(allResponses).map(r => r.data));
  return unique(allData, 'id');
}
```

### API Response Normalization

```typescript
import { 
  groupBy, 
  keyBy, 
  flatten,
  unique
} from '@fluixi/utils/array/advanced';

interface APIUser {
  id: number;
  name: string;
  posts: APIPost[];
}

interface APIPost {
  id: number;
  title: string;
  comments: APIComment[];
}

interface APIComment {
  id: number;
  text: string;
}

interface NormalizedData {
  users: Record<number, Omit<APIUser, 'posts'>>;
  posts: Record<number, Omit<APIPost, 'comments'>>;
  comments: Record<number, APIComment>;
}

function normalizeAPIResponse(users: APIUser[]): NormalizedData {
  // Extract all posts
  const allPosts = flatten(users.map(u => u.posts));
  
  // Extract all comments
  const allComments = flatten(allPosts.map(p => p.comments));
  
  // Create normalized structures
  return {
    users: keyBy(
      users.map(({ posts, ...user }) => user),
      'id'
    ),
    posts: keyBy(
      allPosts.map(({ comments, ...post }) => post),
      'id'
    ),
    comments: keyBy(allComments, 'id')
  };
}
```

## Financial Calculations

### Portfolio Analysis

```typescript
import { 
  sumBy, 
  avgBy, 
  standardDeviation,
  sortBy,
  groupBy
} from '@fluixi/utils/array/advanced';

interface Position {
  symbol: string;
  shares: number;
  price: number;
  sector: string;
}

class PortfolioAnalyzer {
  constructor(private positions: Position[]) {}
  
  getTotalValue() {
    return sumBy(this.positions, p => p.shares * p.price);
  }
  
  getSectorAllocation() {
    const bySector = groupBy(this.positions, 'sector');
    const total = this.getTotalValue();
    
    return Object.entries(bySector).map(([sector, positions]) => {
      const sectorValue = sumBy(positions, p => p.shares * p.price);
      return {
        sector,
        value: sectorValue,
        percentage: (sectorValue / total) * 100,
        positions: positions.length
      };
    });
  }
  
  getTopHoldings(limit = 10) {
    const withValue = this.positions.map(p => ({
      ...p,
      value: p.shares * p.price
    }));
    
    return sortBy(withValue, [{ key: 'value', dir: 'desc' }])
      .slice(0, limit);
  }
  
  calculateRisk() {
    const values = this.positions.map(p => p.shares * p.price);
    const avg = avgBy(this.positions, p => p.shares * p.price);
    const stdDev = standardDeviation(values);
    
    return {
      volatility: stdDev,
      coefficientOfVariation: (stdDev / avg) * 100,
      concentration: this.getConcentrationRisk()
    };
  }
  
  private getConcentrationRisk() {
    const total = this.getTotalValue();
    const topPosition = sortBy(
      this.positions.map(p => ({ ...p, value: p.shares * p.price })),
      [{ key: 'value', dir: 'desc' }]
    )[0];
    
    return (topPosition.value / total) * 100;
  }
}
```

## Gaming & Leaderboards

### Leaderboard Management

```typescript
import { 
  sortBy, 
  rank, 
  partition,
  take,
  findIndex
} from '@fluixi/utils/array/advanced';

interface Player {
  id: number;
  name: string;
  score: number;
  level: number;
  country: string;
}

class Leaderboard {
  constructor(private players: Player[]) {}
  
  getGlobalRankings(limit = 100) {
    const sorted = sortBy(this.players, [
      { key: 'score', dir: 'desc' },
      { key: 'level', dir: 'desc' }
    ]);
    
    const scores = sorted.map(p => p.score);
    const ranks = rank(scores, 'dense');
    
    return take(
      sorted.map((player, index) => ({
        ...player,
        rank: ranks[index],
        isTopTen: ranks[index] <= 10
      })),
      limit
    );
  }
  
  getPlayerRank(playerId: number) {
    const sorted = sortBy(this.players, [{ key: 'score', dir: 'desc' }]);
    const index = findIndex(sorted, p => p.id === playerId);
    
    if (index === -1) return null;
    
    return {
      rank: index + 1,
      player: sorted[index],
      above: index > 0 ? sorted[index - 1] : null,
      below: index < sorted.length - 1 ? sorted[index + 1] : null
    };
  }
  
  getCountryRankings() {
    const byCountry = groupBy(this.players, 'country');
    
    return Object.entries(byCountry).map(([country, players]) => ({
      country,
      topPlayer: sortBy(players, [{ key: 'score', dir: 'desc' }])[0],
      avgScore: avgBy(players, 'score'),
      playerCount: players.length
    }));
  }
}
```

These examples demonstrate real-world usage of the array utilities across various domains. Each example is production-ready and can be adapted to your specific needs.