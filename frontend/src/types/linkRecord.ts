export type Status = "verified" | "unverified" | "false-positive"
export type Jenis = "Judi" | "Pornografi" | "Penipuan"

export type LinkRecord = {
  id: number
  link: string
  jenis: Jenis
  kepercayaan: number
  status: Status
  tanggal: string
  lastModified: string
  modifiedBy: string
  reasoning: string
  image: string
  flagged: boolean
}