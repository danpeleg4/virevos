import "@testing-library/jest-dom";

jest.spyOn(console, "error").mockImplementation(() => {});
