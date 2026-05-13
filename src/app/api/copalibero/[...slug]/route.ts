import { handleCfApi } from "@/lib/cf/api-router";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug?: string[] }> };

export async function GET(request: Request, ctx: Ctx) {
  const { slug = [] } = await ctx.params;
  return handleCfApi(request, slug, "GET");
}

export async function POST(request: Request, ctx: Ctx) {
  const { slug = [] } = await ctx.params;
  return handleCfApi(request, slug, "POST");
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { slug = [] } = await ctx.params;
  return handleCfApi(request, slug, "PATCH");
}
