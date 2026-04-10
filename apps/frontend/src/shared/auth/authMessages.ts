import { ApiError } from "@api-client";
import { getErrorMessage } from "@/shared/utils/format";

export function getAuthErrorMessage(error: unknown, t: (key: any) => string) {
  const errorCode = error instanceof ApiError
    ? error.problem?.errorCode ?? error.errorCode
    : null;

  switch (errorCode) {
    case "auth_email_required":
      return t("auth.emailRequired");
    case "auth_email_invalid":
      return t("auth.errorEmailInvalid");
    case "auth_name_required":
      return t("auth.errorNameRequired");
    case "auth_username_required":
      return t("auth.usernameRequired");
    case "auth_username_invalid":
      return t("auth.errorUsernameInvalid");
    case "auth_username_exists":
      return t("auth.errorUsernameExists");
    case "auth_password_too_short":
      return t("auth.errorPasswordTooShort");
    case "auth_email_exists":
      return t("auth.errorEmailExists");
    case "auth_invalid_credentials":
      return t("auth.errorInvalidCredentials");
    case "auth_reset_email_send_failed":
      return t("auth.errorResetSendFailed");
    case "auth_current_password_invalid":
      return t("auth.errorCurrentPasswordInvalid");
    case "auth_new_password_same_as_current":
      return t("auth.errorNewPasswordSame");
    case "auth_password_confirmation_mismatch":
      return t("auth.errorPasswordConfirmationMismatch");
    case "auth_email_verification_send_failed":
      return t("auth.errorEmailVerificationSendFailed");
    case "auth_email_verification_code_required":
      return t("auth.emailVerificationCodeRequired");
    case "auth_email_verification_code_expired":
      return t("auth.errorEmailVerificationCodeExpired");
    case "auth_email_verification_code_invalid":
      return t("auth.errorEmailVerificationCodeInvalid");
    default: {
      const message = getErrorMessage(error);
      return message === "Something went wrong." ? t("auth.errorGeneric") : message;
    }
  }
}
