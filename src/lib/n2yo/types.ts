export type N2yoTleResponse = {
  info: {
    satid: number
    satname: string
    transactionscount?: number
  }
  tle: string
}

export type N2yoPassRequestInput = {
  noradId: number
  latitude: number
  longitude: number
  elevationM: number
  days: number
}

export type N2yoVisualPassRequestInput = N2yoPassRequestInput & {
  minVisibilitySeconds: number
}

export type N2yoRadioPassRequestInput = N2yoPassRequestInput & {
  minElevation: number
}

export type N2yoVisualPass = {
  startAz?: number
  startAzCompass?: string
  startEl?: number
  startUTC: number
  maxAz?: number
  maxAzCompass?: string
  maxEl: number
  maxUTC: number
  endAz?: number
  endAzCompass?: string
  endEl?: number
  endUTC: number
  mag?: number
  duration?: number
}

export type N2yoRadioPass = {
  startAz?: number
  startAzCompass?: string
  startUTC: number
  maxAz?: number
  maxAzCompass?: string
  maxEl: number
  maxUTC: number
  endAz?: number
  endAzCompass?: string
  endUTC: number
}

export type N2yoVisualPassResponse = {
  info: {
    satid: number
    satname: string
    transactionscount?: number
    passescount?: number
  }
  passes: N2yoVisualPass[]
}

export type N2yoRadioPassResponse = {
  info: {
    satid: number
    satname: string
    transactionscount?: number
    passescount?: number
  }
  passes: N2yoRadioPass[]
}

export type N2yoLookupErrorCode =
  | "configuration"
  | "invalid_satellite"
  | "invalid_request"
  | "rate_limited"
  | "provider_unavailable"
  | "unexpected_response"
