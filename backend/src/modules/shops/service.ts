import { db } from '../../db/client';
import { ConflictError, NotFoundError, ForbiddenError } from '../../errors';

export interface CreateShopPayload {
  name: string;
  description?: string;
  banner_url?: string;
  contact_email?: string;
}

export interface UpdateShopPayload {
  name?: string;
  description?: string;
  banner_url?: string;
  contact_email?: string;
}

export interface ShopResponse {
  id: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  contact_email: string | null;
  created_at: string;
}

export interface ShopResponseWithSeller extends ShopResponse {
  seller_id: string;
}

export class ShopsService {
  async createShop(
    sellerId: string,
    payload: CreateShopPayload
  ): Promise<ShopResponseWithSeller> {
    const { name, description, banner_url, contact_email } = payload;

    try {
      const result = await db.query(
        'INSERT INTO shops (seller_id, name, description, banner_url, contact_email) VALUES ($1, $2, $3, $4, $5) RETURNING id, seller_id, name, description, banner_url, contact_email, created_at',
        [sellerId, name, description || null, banner_url || null, contact_email || null]
      );

      const shop = result.rows[0];
      return {
        id: shop.id,
        seller_id: shop.seller_id,
        name: shop.name,
        description: shop.description,
        banner_url: shop.banner_url,
        contact_email: shop.contact_email,
        created_at: shop.created_at,
      };
    } catch (error: any) {
      // Handle unique constraint violation on seller_id
      if (error.code === '23505' && error.constraint === 'shops_seller_id_key') {
        throw new ConflictError('Seller already has a shop');
      }
      // Handle foreign key constraint violation for seller_id
      if (error.code === '23503') {
        throw new NotFoundError('Seller not found');
      }
      throw error;
    }
  }

  async getShopBySellerId(sellerId: string): Promise<ShopResponseWithSeller> {
    const result = await db.query(
      'SELECT id, seller_id, name, description, banner_url, contact_email, created_at FROM shops WHERE seller_id = $1',
      [sellerId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Shop not found');
    }

    const shop = result.rows[0];
    return {
      id: shop.id,
      seller_id: shop.seller_id,
      name: shop.name,
      description: shop.description,
      banner_url: shop.banner_url,
      contact_email: shop.contact_email,
      created_at: shop.created_at,
    };
  }

  async getShopById(shopId: string): Promise<ShopResponse> {
    const result = await db.query(
      'SELECT id, name, description, banner_url, contact_email, created_at FROM shops WHERE id = $1',
      [shopId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Shop not found');
    }

    const shop = result.rows[0];
    return {
      id: shop.id,
      name: shop.name,
      description: shop.description,
      banner_url: shop.banner_url,
      contact_email: shop.contact_email,
      created_at: shop.created_at,
    };
  }

  async updateShop(
    sellerId: string,
    shopId: string,
    payload: UpdateShopPayload
  ): Promise<ShopResponseWithSeller> {
    // First verify the shop exists and belongs to this seller
    const shopResult = await db.query(
      'SELECT seller_id FROM shops WHERE id = $1',
      [shopId]
    );

    if (shopResult.rows.length === 0) {
      throw new NotFoundError('Shop not found');
    }

    const shop = shopResult.rows[0];
    if (shop.seller_id !== sellerId) {
      throw new ForbiddenError('Access denied');
    }

    // Build update query dynamically based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (payload.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(payload.name);
      paramCount++;
    }
    if (payload.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(payload.description || null);
      paramCount++;
    }
    if (payload.banner_url !== undefined) {
      fields.push(`banner_url = $${paramCount}`);
      values.push(payload.banner_url || null);
      paramCount++;
    }
    if (payload.contact_email !== undefined) {
      fields.push(`contact_email = $${paramCount}`);
      values.push(payload.contact_email || null);
      paramCount++;
    }

    if (fields.length === 0) {
      // No fields to update, just return current shop
      const result = await db.query(
        'SELECT id, seller_id, name, description, banner_url, contact_email, created_at FROM shops WHERE id = $1',
        [shopId]
      );
      const updatedShop = result.rows[0];
      return {
        id: updatedShop.id,
        seller_id: updatedShop.seller_id,
        name: updatedShop.name,
        description: updatedShop.description,
        banner_url: updatedShop.banner_url,
        contact_email: updatedShop.contact_email,
        created_at: updatedShop.created_at,
      };
    }

    values.push(shopId);
    const query = `UPDATE shops SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, seller_id, name, description, banner_url, contact_email, created_at`;

    const result = await db.query(query, values);
    const updatedShop = result.rows[0];
    return {
      id: updatedShop.id,
      seller_id: updatedShop.seller_id,
      name: updatedShop.name,
      description: updatedShop.description,
      banner_url: updatedShop.banner_url,
      contact_email: updatedShop.contact_email,
      created_at: updatedShop.created_at,
    };
  }
}

export const shopsService = new ShopsService();
