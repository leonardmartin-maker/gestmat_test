import { http } from "./http";

export async function createCheckoutSession(
  planCode: string,
  withFuel: boolean = false
): Promise<{ checkout_url: string }> {
  const res = await http.post<{ checkout_url: string }>("/subscription/checkout", {
    plan_code: planCode,
    with_fuel: withFuel,
  });
  return res.data;
}

export async function createCustomerPortalSession(): Promise<{ portal_url: string }> {
  const res = await http.post<{ portal_url: string }>("/subscription/customer-portal");
  return res.data;
}

export async function getStripeConfig(): Promise<{ publishable_key: string }> {
  const res = await http.get<{ publishable_key: string }>("/subscription/stripe-config");
  return res.data;
}
