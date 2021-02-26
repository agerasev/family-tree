import {InName, InPerson, InTree} from "./input";
import inputTI from "../gen/input-ti";
import {createCheckers, func} from "ts-interface-checker";
import {idCheck, randomId} from "./id";

const checkers = createCheckers(inputTI);

export class Name {
  family: string;
  given: string;
  patronymic: string | null;
  maiden: string | null;

  constructor(
    family: string,
    given: string,
    patronymic?: string,
    maiden?: string,
  ) {
    this.family = family;
    this.given = given;
    this.patronymic = patronymic || null;
    this.maiden = maiden || null;
  }

  static fromDict(obj: InName): Name {
    checkers.InName.strictCheck(obj);
    return new Name(
      obj.family,
      obj.given,
      obj.patronymic,
      obj.maiden,
    );
  }

  static createUnknown(): Name {
    return new Name("-", "-");
  }

  text(): string {
    const family = `${this.family}${this.maiden ? " (" + this.maiden! + ")" : ""}`;
    const other = `${this.given}${this.patronymic ? " " + this.patronymic! : ""}`;
    return family + " " + other;
  }
}

export enum Gender {
  Male,
  Female,
}
export function genderFromText(str: "male" | "female"): Gender {
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

export class Person {
  id: string;
  name: Name;
  gender: Gender;
  parents: {
    father: Person,
    mother: Person,
  } | null;
  children: Person[];
  has_children_with: Person[];

  constructor(
    id: string,
    name: Name,
    gender: Gender,
  ) {
    this.id = id;
    this.name = name;
    this.gender = gender;
    this.parents = null;
    this.children = [];
    this.has_children_with = [];
  }

  static fromDict(obj: InPerson) {
    checkers.InPerson.strictCheck(obj);
    return new Person(
      obj.id,
      Name.fromDict(obj.name),
      genderFromText(obj.gender),
    );
  }

  static createUnknown(gender: Gender): Person {
    return new Person(
      randomId(),
      Name.createUnknown(),
      gender,
    );
  }
}

export class Tree {
  version: number[];
  persons: Map<string, Person>;

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
    for (let in_person of obj.persons) {
      const id = in_person.id;
      idCheck(id);
      if (this.persons.has(id)) {
        throw Error(`Identifier '${id}' already exist`);
      }
      this.persons.set(id, Person.fromDict(in_person));
    }
    for (let in_person of obj.persons) {
      let person = this.getPerson(in_person.id);
      if (in_person.parents !== undefined) {
        let father: Person | null = null;
        if (in_person.parents.father !== undefined) {
          father = this.getPerson(in_person.parents.father);
        } else {
          father = Person.createUnknown(Gender.Male);
        }
        father.children.push(person);

        let mother: Person | null = null;
        if (in_person.parents.mother !== undefined) {
          mother = this.getPerson(in_person.parents.mother);
        } else {
          mother = Person.createUnknown(Gender.Female);
        }
        mother.children.push(person);

        person.parents = { father, mother }

        father.has_children_with.push(mother);
        mother.has_children_with.push(father);
      }
    }
  }
}
