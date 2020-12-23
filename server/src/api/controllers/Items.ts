import { Inject, Service } from 'typedi';
import { Router, Request, Response, NextFunction } from 'express';
import { check, param, query, ValidationChain } from 'express-validator';
import asyncMiddleware from 'api/middleware/asyncMiddleware';
import ItemsService from 'services/Items/ItemsService';
import BaseController from 'api/controllers/BaseController';
import DynamicListingService from 'services/DynamicListing/DynamicListService';
import { ServiceError } from 'exceptions';
import { IItemDTO } from 'interfaces';
import { DATATYPES_LENGTH } from 'data/DataTypes';

@Service()
export default class ItemsController extends BaseController {
  @Inject()
  itemsService: ItemsService;

  @Inject()
  dynamicListService: DynamicListingService;

  /**
   * Router constructor.
   */
  router() {
    const router = Router();

    router.post('/', [
      ...this.validateItemSchema,
      ...this.validateNewItemSchema,
    ],
      this.validationResult,
      asyncMiddleware(this.newItem.bind(this)),
      this.handlerServiceErrors,
    );
    router.post(
      '/:id/activate', [
      ...this.validateSpecificItemSchema,
    ],
      this.validationResult,
      asyncMiddleware(this.activateItem.bind(this)),
      this.handlerServiceErrors
    );
    router.post(
      '/:id/inactivate', [
        ...this.validateSpecificItemSchema,
    ],
      this.validationResult,
      asyncMiddleware(this.inactivateItem.bind(this)),
      this.handlerServiceErrors,
    )
    router.post(
      '/:id', [
      ...this.validateItemSchema,
      ...this.validateSpecificItemSchema,
    ],
      this.validationResult,
      asyncMiddleware(this.editItem.bind(this)),
      this.handlerServiceErrors,
    );
    router.delete('/', [
      ...this.validateBulkSelectSchema,
    ],
      this.validationResult,
      asyncMiddleware(this.bulkDeleteItems.bind(this)),
      this.handlerServiceErrors
    );
    router.delete(
      '/:id', [
      ...this.validateSpecificItemSchema,
    ],
      this.validationResult,
      asyncMiddleware(this.deleteItem.bind(this)),
      this.handlerServiceErrors,
    );
    router.get(
      '/:id', [
      ...this.validateSpecificItemSchema,
    ],
      this.validationResult,
      asyncMiddleware(this.getItem.bind(this)),
      this.handlerServiceErrors,
    );
    router.get(
      '/', [
      ...this.validateListQuerySchema,
    ],
      this.validationResult,
      asyncMiddleware(this.getItemsList.bind(this)),
      this.dynamicListService.handlerErrorsToResponse,
      this.handlerServiceErrors,
    );
    return router;
  }

  /**
   * New item validation schema.
   */
  get validateNewItemSchema(): ValidationChain[] {
    return [
      check('opening_quantity').default(0).isInt({ min: 0 }).toInt(),
      check('opening_cost').optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
      check('opening_date').optional({ nullable: true }).isISO8601(),
    ];
  }

  /**
   * Validate item schema.
   */
  get validateItemSchema(): ValidationChain[] {
    return [
      check('name').exists().isString().isLength({ max: DATATYPES_LENGTH.STRING }),
      check('type').exists()
        .isString()
        .trim()
        .escape()
        .isIn(['service', 'non-inventory', 'inventory']),
      check('code')
        .optional({ nullable: true })
        .isString()
        .trim()
        .escape()
        .isLength({ max: DATATYPES_LENGTH.STRING }),
      // Purchase attributes.
      check('purchasable').optional().isBoolean().toBoolean(),
      check('cost_price')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: DATATYPES_LENGTH.DECIMAL_13_3 })
        .toFloat()
        .if(check('purchasable').equals('true'))
        .exists(),
      check('cost_account_id')
        .optional({ nullable: true })
        .isInt({ min: 0, max: DATATYPES_LENGTH.INT_10 })
        .toInt()
        .if(check('purchasable').equals('true'))
        .exists(),
      // Sell attributes.
      check('sellable').optional().isBoolean().toBoolean(),
      check('sell_price')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: DATATYPES_LENGTH.DECIMAL_13_3 })
        .toFloat()
        .if(check('sellable').equals('true'))
        .exists(),
      check('sell_account_id')
        .optional({ nullable: true })
        .isInt({ min: 0, max: DATATYPES_LENGTH.INT_10 })
        .toInt()
        .if(check('sellable').equals('true'))
        .exists(),
      check('inventory_account_id')
        .optional({ nullable: true })
        .isInt({ min: 0, max: DATATYPES_LENGTH.INT_10 })
        .toInt()
        .if(check('type').equals('inventory'))
        .exists(),
      check('sell_description')
        .optional({ nullable: true })
        .isString()
        .trim()
        .escape()
        .isLength({ max: DATATYPES_LENGTH.TEXT }),
      check('cost_description')
        .optional({ nullable: true })
        .isString()
        .trim()
        .escape()
        .isLength({ max: DATATYPES_LENGTH.TEXT }),
      check('category_id')
        .optional({ nullable: true })
        .isInt({ min: 0, max: DATATYPES_LENGTH.INT_10 })
        .toInt(),
      check('note')
        .optional()
        .isString()
        .trim()
        .escape()
        .isLength({ max: DATATYPES_LENGTH.TEXT }),
      check('active').optional().isBoolean().toBoolean(),

      check('media_ids').optional().isArray(),
      check('media_ids.*').exists().isNumeric().toInt(),
    ];
  }

  /**
   * Validate specific item params schema.
   * @return {ValidationChain[]}
   */
  get validateSpecificItemSchema(): ValidationChain[] {
    return [
      param('id').exists().isNumeric().toInt(),
    ];
  }

  /**
   * Bulk select validation schema.
   * @return {ValidationChain[]}
   */
  get validateBulkSelectSchema(): ValidationChain[] {
    return [
      query('ids').isArray({ min: 1 }),
      query('ids.*').isNumeric().toInt(),
    ];
  }

  /**
   * Validate list query schema
   */
  get validateListQuerySchema() {
    return [
      query('column_sort_by').optional().trim().escape(),
      query('sort_order').optional().isIn(['desc', 'asc']),

      query('page').optional().isNumeric().toInt(),
      query('page_size').optional().isNumeric().toInt(),

      query('custom_view_id').optional().isNumeric().toInt(),
      query('stringified_filter_roles').optional().isJSON(),
    ]
  }

  /**
   * Stores the given item details to the storage.
   * @param {Request} req 
   * @param {Response} res 
   */
  async newItem(req: Request, res: Response, next: NextFunction) {
    const { tenantId } = req;
    const itemDTO: IItemDTO = this.matchedBodyData(req);

    try {
      const storedItem = await this.itemsService.newItem(tenantId, itemDTO);

      return res.status(200).send({
        id: storedItem.id,
        message: 'Item has been created successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates the given item details on the storage.
   * @param {Request} req 
   * @param {Response} res 
   */
  async editItem(req: Request, res: Response, next: NextFunction) {
    const { tenantId } = req;
    const itemId: number = req.params.id;
    const item: IItemDTO = this.matchedBodyData(req);
    
    try {
      await this.itemsService.editItem(tenantId, itemId, item);
      return res.status(200).send({ id: itemId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activates the given item.
   * @param {Request} req 
   * @param {Response} res 
   * @param {NextFunction} next 
   */
  async activateItem(req: Request, res: Response, next: NextFunction) {
    const { tenantId } = req;
    const itemId: number = req.params.id;

    try {
      await this.itemsService.activateItem(tenantId, itemId);

      return res.status(200).send({
        id: itemId,
        message: 'The item has been activated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Inactivates the given item.
   * @param {Request} req 
   * @param {Response} res 
   * @param {NextFunction} next 
   */
  async inactivateItem(req: Request, res: Response, next: NextFunction) {
    const { tenantId } = req;
    const itemId: number = req.params.id;

    try {
      await this.itemsService.inactivateItem(tenantId, itemId);

      return res.status(200).send({
        id: itemId,
        message: 'The item has been inactivated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes the given item from the storage.
   * @param {Request} req 
   * @param {Response} res 
   */
  async deleteItem(req: Request, res: Response, next: NextFunction) {
    const itemId: number = req.params.id;
    const { tenantId } = req;

    try {
      await this.itemsService.deleteItem(tenantId, itemId);
      return res.status(200).send({ id: itemId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieve details the given item id. 
   * @param {Request} req 
   * @param {Response} res 
   * @return {Response} 
   */
  async getItem(req: Request, res: Response, next: NextFunction) {
    const itemId: number = req.params.id;
    const { tenantId } = req;

    try {
      const storedItem = await this.itemsService.getItem(tenantId, itemId);

      return res.status(200).send({ item: storedItem });
    } catch (error) {
      console.log(error);

      next(error)
    }
  }

  /**
   * Retrieve items datatable list.
   * @param {Request} req 
   * @param {Response} res 
   */
  async getItemsList(req: Request, res: Response, next: NextFunction) {
    const { tenantId } = req;
    const filter = {
      filterRoles: [],
      sortOrder: 'asc',
      columnSortBy: 'created_at',
      page: 1,
      pageSize: 12,
      ...this.matchedQueryData(req),
    };
    if (filter.stringifiedFilterRoles) {
      filter.filterRoles = JSON.parse(filter.stringifiedFilterRoles);
    }
    try {
      const {
        items,
        pagination,
        filterMeta
      } = await this.itemsService.itemsList(tenantId, filter);

      return res.status(200).send({
        items,
        pagination: this.transfromToResponse(pagination),
        filter_meta: this.transfromToResponse(filterMeta),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes items in bulk.
   * @param {Request} req 
   * @param {Response} res 
   * @param {NextFunction} next 
   */
  async bulkDeleteItems(req: Request, res: Response, next: NextFunction) {
    const { tenantId } = req;
    const { ids: itemsIds } = req.query;
  
    try {
      await this.itemsService.bulkDeleteItems(tenantId, itemsIds);

      return res.status(200).send({
        ids: itemsIds,
        message: 'Items have been deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles service errors.
   * @param {Error} error 
   * @param {Request} req 
   * @param {Response} res 
   * @param {NextFunction} next 
   */
  handlerServiceErrors(error: Error, req: Request, res: Response, next: NextFunction) {
    if (error instanceof ServiceError) {
      if (error.errorType === 'NOT_FOUND') {
        return res.status(400).send({
          errors: [{ type: 'ITEM.NOT.FOUND', code: 140 }],
        });
      }
      if (error.errorType === 'ITEM_CATEOGRY_NOT_FOUND') {
        return res.status(400).send({
          errors: [{ type: 'ITEM_CATEGORY.NOT.FOUND', code: 140 }],
        });
      }
      if (error.errorType === 'ITEM_NAME_EXISTS') {
        return res.status(400).send({
          errors: [{ type: 'ITEM.NAME.ALREADY.EXISTS', code: 210 }],
        });
      }
      if (error.errorType === 'COST_ACCOUNT_NOT_FOUMD') {
        return res.status(400).send({
          errors: [{ type: 'COST.ACCOUNT.NOT.FOUND', code: 120 }],
        });
      }
      if (error.errorType === 'COST_ACCOUNT_NOT_COGS') {
        return res.status(400).send({
          errors: [{ type: 'COST.ACCOUNT.NOT.COGS.TYPE', code: 220 }],
        });
      }
      if (error.errorType === 'SELL_ACCOUNT_NOT_FOUND') {
        return res.status(400).send({
          errors: [{ type: 'SELL.ACCOUNT.NOT.FOUND', code: 130 }],
        });
      }
      if (error.errorType === 'SELL_ACCOUNT_NOT_INCOME') {
        return res.status(400).send({
          errors: [{ type: 'SELL.ACCOUNT.NOT.INCOME.TYPE', code: 230 }],
        });
      }
      if (error.errorType === 'COST_ACCOUNT_NOT_FOUMD') {
        return res.status(400).send({
          errors: [{ type: 'COST.ACCOUNT.NOT.FOUND', code: 120 }],
        });
      }
      if (error.errorType === 'COST_ACCOUNT_NOT_COGS') {
        return res.status(400).send({
          errors: [{ type: 'COST.ACCOUNT.NOT.COGS.TYPE', code: 220 }],
        });
      }
      if (error.errorType === 'SELL_ACCOUNT_NOT_FOUND') {
        return res.status(400).send({
          errors: [{ type: 'SELL.ACCOUNT.NOT.FOUND', code: 130 }],
        });
      }
      if (error.errorType === 'INVENTORY_ACCOUNT_NOT_FOUND') {
        return res.status(400).send({
          errors: [{ type: 'INVENTORY.ACCOUNT.NOT.FOUND', code: 200 }],
        });
      }
      if (error.errorType === 'SELL_ACCOUNT_NOT_INCOME') {
        return res.status(400).send({
          errors: [{ type: 'SELL.ACCOUNT.NOT.INCOME.TYPE', code: 230 }],
        });
      }
      if (error.errorType === 'INVENTORY_ACCOUNT_NOT_INVENTORY') {
        return res.status(400).send({
          errors: [{ type: 'INVENTORY.ACCOUNT.NOT.CURRENT.ASSET', code: 300 }],
        });
      }
      if (error.errorType === 'ITEMS_HAVE_ASSOCIATED_TRANSACTIONS') {
        return res.status(400).send({
          errors: [{ type: 'ITEMS_HAVE_ASSOCIATED_TRANSACTIONS', code: 310 }],
        });
      }
      if (error.errorType === 'ITEM_HAS_ASSOCIATED_TRANSACTINS') {
        return res.status(400).send({
          errors: [{ type: 'ITEM_HAS_ASSOCIATED_TRANSACTINS', code: 320 }],
        })
      }
    }
    next(error);
  }
}