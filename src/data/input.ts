export interface InName {
  given: string,
  family?: string,
  patronymic?: string,
  maiden?: string,
}

export type InDate = {
  day?: string,
  month?: string,
  year?: string,
} | string;

export interface InPerson {
  id: string,
  name: InName,
  gender: "male" | "female",
  parents?: {
    father?: string,
    mother?: string,
  },
  birth?: {
    date?: InDate,
    place?: string[],
  },
  image?: string,
}

export interface InTree {
  version: string,
  persons: InPerson[],
}
