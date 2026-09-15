/**
 * Seeds the workspace used in the screenshots and the README.
 *   npm run seed
 */
import { PrismaClient } from "@prisma/client";
import { compilePath } from "../src/lib/path";

const prisma = new PrismaClient();

const ENDPOINTS = [
  {
    method: "GET",
    path: "/orders",
    description: "an orders list with customer, total in rupees, and status",
    responseBody: [
      { id: "ord_92kd", customer: "Rohan Mehta", total: 4820, status: "shipped" },
      { id: "ord_71bz", customer: "Ananya Iyer", total: 1290, status: "pending" },
      { id: "ord_4d0p", customer: "Kabir Nair", total: 7340, status: "shipped" },
      { id: "ord_8sm2", customer: "Meera Kulkarni", total: 2210, status: "cancelled" },
    ],
    statusCode: 200,
  },
  {
    method: "GET",
    path: "/orders/:id",
    description: "a single order with line items",
    responseBody: {
      id: "{{id}}",
      customer: "Rohan Mehta",
      total: 4820,
      status: "shipped",
      items: [
        { sku: "TS-401", qty: 2, price: 1410 },
        { sku: "MG-118", qty: 1, price: 2000 },
      ],
      fetchedAt: "{{now}}",
    },
    statusCode: 200,
    delayMs: 1200,
    failureRate: 20,
    failureStatus: 500,
  },
  {
    method: "POST",
    path: "/orders",
    description: "create an order",
    responseBody: { id: "ord_new1", status: "pending", createdAt: "{{now}}" },
    statusCode: 201,
  },
  {
    method: "GET",
    path: "/files/*",
    description: "any file below /files",
    responseBody: { path: "{{wildcard}}", url: "https://cdn.example/{{wildcard}}" },
    statusCode: 200,
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@mockbird.local" },
    update: {},
    create: { email: "demo@mockbird.local", name: "Demo" },
  });

  const workspace = await prisma.workspace.upsert({
    where: { key: "a8f3k2" },
    update: {},
    create: { key: "a8f3k2", name: "Orders API", userId: user.id },
  });

  for (const e of ENDPOINTS) {
    const compiled = compilePath(e.path);
    await prisma.endpoint.upsert({
      where: {
        workspaceId_method_path: {
          workspaceId: workspace.id,
          method: e.method,
          path: compiled.path,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        method: e.method,
        path: compiled.path,
        segments: compiled.segments as never,
        specificity: compiled.specificity,
        description: e.description,
        responseBody: e.responseBody as never,
        statusCode: e.statusCode,
        delayMs: e.delayMs ?? 0,
        failureRate: e.failureRate ?? 0,
        failureStatus: e.failureStatus ?? 500,
      },
    });
  }

  console.log(`Seeded workspace a8f3k2 with ${ENDPOINTS.length} endpoints.`);
  console.log("Try: curl -s http://localhost:3000/m/a8f3k2/orders");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
