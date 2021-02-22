export interface InName {
  family: string,
  given: string,
  patronymic?: string,
  maiden?: string,
}

export interface InPerson {
  id: string,
  name: InName,
  gender: "male" | "female",
  parents?: {
    father?: string,
    mother?: string,
  },
}

export interface InTree {
  version: string,
  persons: InPerson[],
}
