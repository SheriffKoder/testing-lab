/**
 * @file tests/unit/entities/invoice/mutations/create-invoice.test.ts
 * Mutation unit tests for createInvoice — mock Supabase, keep mapping real.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: proving insert snake_case mapping + error throwing without a real DB.
 *
 * Mocking syntax used here:
 * - jest.mock("@/lib/supabase/server") — replace createClient (external system)
 * - jest.mocked(createClient) — typed mock of the client factory
 * - mockResolvedValue — fulfilled client / insert result without a network call
 * - mockReset — clear call history between tests
 *
 * Stays real: createInvoice mapping / error throwing, toInvoice row → domain.
 * Not mocked: formatters, CreateInvoiceForm, the mutation module itself.
 *
 * Chain under test: createClient → from → insert → select → single
 */

import { createClient } from "@/lib/supabase/server";
import { createInvoice } from "@/entities/invoice/mutations/create-invoice";
import {
  createdInvoice,
  createdInvoiceRow,
  expectedCreateInvoiceInsert,
  validInvoiceInput,
} from "@/tests/fixtures/invoices";

// jest.mock — hoisted. Swap the Supabase factory so createInvoice never opens
// next/headers or a real PostgREST connection.
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);

/**
 * Minimal chainable fake matching createInvoice’s builder calls:
 *   .from(table).insert(row).select(columns).single()
 *
 * Each step is a jest.fn so we can assert table name + insert payload.
 */
function createSupabaseInsertChain(singleResult: {
  data: unknown;
  error: { message: string } | null;
}) {
  // single() — terminal await; returns { data, error } like PostgREST.
  const single = jest.fn().mockResolvedValue(singleResult);
  // select(columns) — returns an object with .single().
  const select = jest.fn(() => ({ single }));
  // insert(row) — returns an object with .select().
  const insert = jest.fn(() => ({ select }));
  // from(table) — returns an object with .insert().
  const from = jest.fn(() => ({ insert }));

  return { from, insert, select, single };
}

describe("createInvoice", () => {
  beforeEach(() => {
    // mockReset — drop prior createClient implementations and call history.
    mockedCreateClient.mockReset();
  });

  it("inserts snake_case columns and returns a domain Invoice", async () => {
    const chain = createSupabaseInsertChain({
      data: createdInvoiceRow,
      error: null,
    });

    // mockResolvedValue — createClient is async; resolve to our fake client.
    mockedCreateClient.mockResolvedValue(
      chain as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    // createInvoice + toInvoice stay real — only the external client is faked.
    const result = await createInvoice(validInvoiceInput);

    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    expect(chain.from).toHaveBeenCalledWith("tl_invoices");
    expect(chain.insert).toHaveBeenCalledWith(expectedCreateInvoiceInsert);
    expect(result).toEqual(createdInvoice);
  });

  it("throws when Supabase returns an error", async () => {
    const chain = createSupabaseInsertChain({
      data: null,
      error: { message: "duplicate key value" },
    });

    mockedCreateClient.mockResolvedValue(
      chain as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    // expect(...).rejects.toThrow — async failure path; no network, no DB row.
    await expect(createInvoice(validInvoiceInput)).rejects.toThrow(
      "Failed to create invoice: duplicate key value",
    );
    expect(chain.from).toHaveBeenCalledWith("tl_invoices");
  });
});
