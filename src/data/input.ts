export interface InName {
  given: string,
  family?: string | string[],
  patronymic?: string,
}

export type InDate = {
  day?: number,
  month?: number,
  year?: number,
} | string;

export type InEventType =
  "birth" |
  "death";

export interface InEvent {
  type: InEventType,
  date?: InDate,
  place?: string[],
}

export type InGender = "male" | "female";

export interface InPerson {
  id: string,
  name: InName,
  gender: InGender,
  parents?: {
    father?: string,
    mother?: string,
  },
  events?: InEvent[],
  image?: string,
}

export interface InTree {
  version: string,
  persons: InPerson[],
}
