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

export type InPlace = string[];

export type InEventType =
  "birth" |
  "death" |
  "settle";

export interface InEvent {
  type: InEventType,
  date?: InDate,
  place?: InPlace,
}

export type InGender = "male" | "female";

export interface InPerson {
  id: string,
  gender: InGender,
  name?: InName,
  parents?: {
    father?: string,
    mother?: string,
  },
  events?: InEvent[],
  image?: string,
}

export interface InMarriage {
  husband: string,
  wife: string,
  date?: InDate,
  place?: InPlace,
}

export interface InTree {
  version: string,
  persons: InPerson[],
  marriages: InMarriage[],
}
