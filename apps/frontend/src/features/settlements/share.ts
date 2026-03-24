export type SettlementSharePaymentInfo = {
  payeeName: string;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  notes: string;
  paymentQrDataUrl: string;
};

export type SettlementShareReceiverPaymentInfo = {
  participantId: string;
  participantName: string;
  paymentInfo: SettlementSharePaymentInfo;
};

const MAX_QR_DIMENSION = 512;
const MAX_QR_DATA_URL_LENGTH = 180_000;
const MAX_PROOF_DIMENSION = 1600;
const MAX_PROOF_DATA_URL_LENGTH = 240_000;

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizePaymentInfo(paymentInfo: Partial<SettlementSharePaymentInfo> | null | undefined): SettlementSharePaymentInfo {
  return {
    payeeName: clean(paymentInfo?.payeeName),
    paymentMethod: clean(paymentInfo?.paymentMethod),
    accountName: clean(paymentInfo?.accountName),
    accountNumber: clean(paymentInfo?.accountNumber),
    notes: clean(paymentInfo?.notes),
    paymentQrDataUrl: clean(paymentInfo?.paymentQrDataUrl)
  };
}

export function createEmptySharePaymentInfo(): SettlementSharePaymentInfo {
  return {
    payeeName: "",
    paymentMethod: "",
    accountName: "",
    accountNumber: "",
    notes: "",
    paymentQrDataUrl: ""
  };
}

export function hasSharePaymentInfo(paymentInfo: Partial<SettlementSharePaymentInfo> | null | undefined) {
  return Object.values(normalizePaymentInfo(paymentInfo)).some((value) => value.length > 0);
}

export function hasSharePaymentTextInfo(paymentInfo: Partial<SettlementSharePaymentInfo> | null | undefined) {
  const normalized = normalizePaymentInfo(paymentInfo);
  return [
    normalized.payeeName,
    normalized.paymentMethod,
    normalized.accountName,
    normalized.accountNumber,
    normalized.notes
  ].some((value) => value.length > 0);
}

export async function prepareSettlementShareQrDataUrl(file: File) {
  return prepareSettlementImageDataUrl(file, MAX_QR_DIMENSION, MAX_QR_DATA_URL_LENGTH);
}

export async function prepareSettlementProofImageDataUrl(file: File) {
  return prepareSettlementImageDataUrl(file, MAX_PROOF_DIMENSION, MAX_PROOF_DATA_URL_LENGTH);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

async function prepareSettlementImageDataUrl(file: File, maxDimension: number, maxDataUrlLength: number) {
  if (!file.type.startsWith("image/")) {
    throw new Error("unsupported-file");
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const normalizedDataUrl = await normalizeImageDataUrl(originalDataUrl, maxDimension);

  if (normalizedDataUrl.length > maxDataUrlLength) {
    throw new Error("file-too-large");
  }

  return normalizedDataUrl;
}

async function normalizeImageDataUrl(source: string, targetMaxDimension: number) {
  if (typeof document === "undefined") {
    return source;
  }

  const image = await loadImage(source);
  const imageMaxDimension = Math.max(image.naturalWidth || 0, image.naturalHeight || 0);
  if (imageMaxDimension === 0) {
    throw new Error("image-load-failed");
  }

  const scale = Math.min(1, targetMaxDimension / imageMaxDimension);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return source;
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, width, height);

  const compressedDataUrl = canvas.toDataURL("image/webp", 0.92);
  return compressedDataUrl.length < source.length ? compressedDataUrl : source;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-load-failed"));
    image.src = source;
  });
}
