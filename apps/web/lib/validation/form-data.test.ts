import { describe, expect, it } from "vitest";

import { formDataObject } from "./form-data";

describe("formDataObject", () => {
  it("reads direct field names", () => {
    const formData = new FormData();
    formData.set("name", "Tokyo Trip");

    expect(formDataObject(formData, ["name"])).toEqual({ name: "Tokyo Trip" });
  });

  it("reads React action prefixed field names", () => {
    const formData = new FormData();
    formData.set("_1_receiverPaymentInfosJson", '[{"receiverName":"tester1"}]');

    expect(formDataObject(formData, ["receiverPaymentInfosJson"])).toEqual({
      receiverPaymentInfosJson: '[{"receiverName":"tester1"}]',
    });
  });
});
