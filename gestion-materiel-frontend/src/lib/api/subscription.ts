import { http } from "./http";

export type PlanOut = {
  code: string;
  name: string;
  price_chf: number;
  extra_employee_price_chf: number;
  max_employees: number;
  max_vehicles: number;
  max_assets: number;
  trial_days: number;
};

export type SubscriptionOut = {
  id: number;
  plan_code: string;
  plan_name: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  extra_employees: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export type LimitsOut = {
  plan_code: string;
  plan_name: string;
  status: string;
  max_employees: number;
  max_vehicles: number;
  max_assets: number;
  extra_employees: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

export type SubscriptionResponse = {
  subscription: SubscriptionOut | null;
  limits: LimitsOut | null;
  plans: PlanOut[];
};

export type CompanyOut = {
  id: number;
  name: string;
  slug: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  logo_path: string | null;
};

export async function getSubscription(): Promise<SubscriptionResponse> {
  const res = await http.get<SubscriptionResponse>("/subscription");
  return res.data;
}

export async function getPlans(): Promise<{ plans: PlanOut[] }> {
  const res = await http.get<{ plans: PlanOut[] }>("/subscription/plans");
  return res.data;
}

export async function changePlan(planCode: string): Promise<void> {
  await http.post("/subscription/change-plan", { plan_code: planCode });
}

export async function addExtraEmployees(count: number): Promise<void> {
  await http.post("/subscription/add-employees", { count });
}

export async function getCompanyInfo(): Promise<CompanyOut> {
  const res = await http.get<CompanyOut>("/subscription/company");
  return res.data;
}

export async function updateCompanyInfo(data: {
  name?: string;
  contact_email?: string;
  phone?: string;
  address?: string;
}): Promise<void> {
  await http.patch("/subscription/company", data);
}
