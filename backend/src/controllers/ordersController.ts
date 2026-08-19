import type { Request, Response } from "express";
import * as ordersService from "../services/ordersService";
import { createOrderSchema, toOrderResponse } from "../dtos/order.dto";

/**
 * HTTP layer for orders. Its whole job is:
 *   validate input -> call one service -> send a response.
 *
 * No SQL, no business rules. Errors are simply thrown: Express 5
 * forwards a rejected promise from an async handler to the error
 * middleware automatically, so no try/catch is needed here.
 */

/** POST /api/orders */
export async function createOrder(req: Request, res: Response): Promise<void> {
  // .parse() throws a ZodError if the body is invalid, which the error
  // handler turns into a 400 with a field-by-field breakdown. On success
  // it returns a NEW object containing only the declared fields, so any
  // extra keys the client sent are dropped here.
  const request = createOrderSchema.parse(req.body);

  const order = await ordersService.placeOrder(request);

  // 201 Created: a new resource now exists. toOrderResponse converts the
  // entity into the API shape - ISO date strings, and no jobId.
  res.status(201).json(toOrderResponse(order));
}
