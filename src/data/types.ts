import {InDate, InEvent, InEventType, InGender, InMarriage, InName, InPerson, InTree} from "./input";
import inputTI from "../gen/input-ti";
import {createCheckers, func} from "ts-interface-checker";
import {idCheck, mixIds, randomId} from "./id";

const checkers = createCheckers(inputTI);

export class Name {
  given: string;
  family: string[];
  patronymic: string | null;

  constructor(
    given: string,
    family?: string[],
    patronymic?: string,
  ) {
    this.given = given;
    this.family = family || [];
    this.patronymic = patronymic || null;
  }

  static fromDict(obj: InName): Name {
    checkers.InName.strictCheck(obj);
    let family = null;
    if (typeof obj.family === "string") {
      family = [obj.family];
    } else {
      family = obj.family;
    }
    return new Name(
      obj.given,
      family,
      obj.patronymic,
    );
  }

  static createUnknown(): Name {
    return new Name("");
  }
  isUnknown(): boolean {
    return this.given.length === 0 && this.family.length === 0 && this.patronymic === null;
  }
}

export enum Gender {
  Male,
  Female,
}
export function genderFromText(str: InGender): Gender {
  switch (str) {
    case "male": {
      return Gender.Male;
    }
    case "female": {
      return Gender.Female;
    }
  }
}
export function genderInverse(gender: Gender): Gender {
  switch (gender) {
    case Gender.Male:
      return Gender.Female;
    case Gender.Female:
      return Gender.Male;
  }
}

export enum EventType {
  Birth,
  Death,
  Settle,
}
export function eventTypeFromText(str: InEventType): EventType {
  switch (str) {
    case "birth": {
      return EventType.Birth;
    }
    case "death": {
      return EventType.Death;
    }
    case "settle": {
      return EventType.Settle;
    }
  }
}

export function readDate(date: InDate): Date {
  if (typeof date === "string") {
    return new Date(date);
  } else {
    let res = new Date();
    if (date.year !== undefined) {
      res.setFullYear(date.year);
    }
    if (date.month !== undefined) {
      res.setMonth(date.month);
    }
    if (date.day !== undefined) {
      res.setDate(date.day);
    }
    return res;
  }
}

export type Place = string[]; 

export class Event {
  type: EventType;
  date: Date | null;
  place: Place | null;

  constructor(
    type: EventType,
    date?: Date,
    place?: Place,
  ) {
    this.type = type;
    this.date = date || null;
    this.place = place || null;
  }
  static readDict(obj: InEvent): Event {
    checkers.InEvent.strictCheck(obj);
    return new Event(
      eventTypeFromText(obj.type),
      obj.date ? readDate(obj.date) : undefined,
      obj.place,
    );
  }
};

export class Person {
  id: string;
  name: Name;
  gender: Gender;
  parents: {
    father: Person,
    mother: Person,
  } | null;
  children: Person[];
  has_children_with: Map<string, Person>;
  marriages: Map<string, Marriage>;
  spouses: Map<string, Person>;
  events: Event[];
  image: string;

  constructor(
    id: string,
    name: Name,
    gender: Gender,
    events?: Event[],
    image?: string,
  ) {
    this.id = id;
    this.name = name;
    this.gender = gender;
    this.parents = null;

    this.children = [];
    this.has_children_with = new Map<string, Person>();
    this.marriages = new Map<string, Marriage>();
    this.spouses = new Map<string, Person>();

    this.events = events || [];
    if (image !== undefined) {
      this.image = "data/" + image;
    } else {
      switch (gender) {
        case Gender.Male: {
          this.image = "images/unknown-male.jpg";
          break;
        }
        case Gender.Female: {
          this.image = "images/unknown-female.jpg";
          break;
        }
      }
    }
  }

  static fromDict(obj: InPerson) {
    checkers.InPerson.strictCheck(obj);
    return new Person(
      obj.id,
      Name.fromDict(obj.name),
      genderFromText(obj.gender),
      obj.events ? obj.events.map(evt => Event.readDict(evt)) : undefined,
      obj.image,
    );
  }

  static createUnknown(gender: Gender): Person {
    return new Person(
      randomId(),
      Name.createUnknown(),
      gender,
    );
  }
  isUnknown(): boolean {
    return this.name.isUnknown();
  }

  addMarriage(marriage: Marriage) {
    this.marriages.set(marriage.id, marriage);
    if (this === marriage.husband) {
      this.spouses.set(marriage.wife.id, marriage.wife);
    } else if (this === marriage.wife) {
      this.spouses.set(marriage.husband.id, marriage.husband);
    } else {
      throw Error("Wrong marriage");
    }
  }
}

export class Marriage {
  id: string;
  husband: Person;
  wife: Person;
  date: Date | null;
  place: Place | null;

  constructor(
    husband: Person,
    wife: Person,
    date?: Date,
    place?: Place,
  ) {
    this.id = mixIds(husband.id, wife.id);
    this.husband = husband;
    this.wife = wife;
    this.date = date || null;
    this.place = place || null;
  }

  static fromDict(husband: Person, wife: Person, obj: InMarriage) {
    checkers.InMarriage.strictCheck(obj);
    if (
      husband.id !== obj.husband || husband.gender !== Gender.Male ||
      wife.id !== obj.wife || wife.gender !== Gender.Female
    ) {
      throw Error("Marriage mismatch");
    }
    return new Marriage(
      husband,
      wife,
      obj.date ? readDate(obj.date) : undefined,
      obj.place,
    );
  }
}

export class Tree {
  version: number[];
  persons: Map<string, Person>;
  marriages: Map<string, Marriage>;

  getPerson(id: string): Person {
    const person = this.persons.get(id);
    if (person === undefined) {
      throw Error(`Identifier '${id}' does not exist`);
    }
    return person;
  }

  constructor(obj: InTree) {
    checkers.InTree.strictCheck(obj);
    this.version = obj.version.split(".").map(s => parseInt(s));
    this.persons = new Map<string, Person>();
    this.marriages = new Map<string, Marriage>();

    // Person
    for (let in_person of obj.persons) {
      const id = in_person.id;
      idCheck(id);
      if (this.persons.has(id)) {
        throw Error(`Identifier '${id}' already exist`);
      }
      this.persons.set(id, Person.fromDict(in_person));
    }

    // Parents
    for (let in_person of obj.persons) {
      let person = this.getPerson(in_person.id);
      
      if (in_person.parents !== undefined) {
        let father: Person | null = null;
        if (in_person.parents.father !== undefined) {
          father = this.getPerson(in_person.parents.father);
          if (father.gender !== Gender.Male) {
            throw Error("Gender mismatch");
          }
        }
        let mother: Person | null = null;
        if (in_person.parents.mother !== undefined) {
          mother = this.getPerson(in_person.parents.mother);
          if (mother.gender !== Gender.Female) {
            throw Error("Gender mismatch");
          }
        }

        if (father === null) {
          if (mother === null) {
            throw Error("Both parents are unknown");
          }
          for (let f of mother.has_children_with.values()) {
            if (f.isUnknown()) {
              father = f;
              break;
            }
          }
          if (father === null) {
            father = Person.createUnknown(Gender.Male);
          }
        } else if (mother === null) {
          for (let m of father.has_children_with.values()) {
            if (m.isUnknown()) {
              mother = m;
              break;
            }
          }
          if (mother === null) {
            mother = Person.createUnknown(Gender.Female);
          }
        }

        father.children.push(person);
        mother.children.push(person);

        person.parents = { father, mother }

        father.has_children_with.set(mother.id, mother);
        mother.has_children_with.set(father.id, father);
      }
    }

    // Marriages
    for (let in_marriage of obj.marriages) {
      const husband = this.getPerson(in_marriage.husband);
      const wife = this.getPerson(in_marriage.wife);
      const marriage = Marriage.fromDict(husband, wife, in_marriage);
      this.marriages.set(marriage.id, marriage);
      husband.addMarriage(marriage);
      wife.addMarriage(marriage);
    }
  }
}
