import "@testing-library/jest-dom";

jest.spyOn(console, "error").mockImplementation(() => {});

process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = "price_pro";
process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_biz";
