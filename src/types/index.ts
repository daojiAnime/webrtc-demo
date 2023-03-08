export type InitMessageType = {
  uuid: string
  other: Array<string>
}
export type PeerItemType = {
  [k: string]: RTCPeerConnection | null
}

export type ConnectMessageType = {
  to: string
  from: string
  data: string
  event: string
}

export default {};