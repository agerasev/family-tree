import {InName, InPerson, InTree} from "./input";
import inputTI from "./gen/input-ti";
import {createCheckers, func} from "ts-interface-checker";
import {idCheck} from "./id";

const checkers = createCheckers(inputTI);

export class Name {
  family: string;
  given: string;
  patronymic: string | null;
  maiden: string | null;

  constructor(obj: InName) {
    checkers.InName.strictCheck(obj);
    this.family = obj.family;
    this.given = obj.given;
    this.patronymic = obj.patronymic || null;
    this.maiden = obj.maiden || null;
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
export function makeGender(str: "male" | "female"): Gender {
  switch (str) {
    case "male": {
      return Gender.Male;
    }
    case "female": {
      return Gender.Female;
    }
  }
}

export class Person {
  name: Name;
  gender: Gender;
  parents: {
    father: Person | null,
    mother: Person | null,
  };
  children: Person[];
  has_children_with: Person[];

  constructor(obj: InPerson) {
    checkers.InPerson.strictCheck(obj);
    this.name = new Name(obj.name);
    this.gender = makeGender(obj.gender);
    this.parents = { father: null, mother: null };
    this.children = [];
    this.has_children_with = [];
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
      this.persons.set(id, new Person(in_person));
    }
    for (let in_person of obj.persons) {
      let person = this.getPerson(in_person.id);
      if (in_person.parents !== undefined) {
        let [father, mother]: [Person | null, Person | null] = [null, null];
        if (in_person.parents.father !== undefined) {
          father = this.getPerson(in_person.parents.father);
          person.parents.father = father;
          father.children.push(person);
        }
        if (in_person.parents.mother !== undefined) {
          mother = this.getPerson(in_person.parents.mother);
          person.parents.mother = mother;
          mother.children.push(person);
        }
        if (father !== null && mother !== null) {
          father.has_children_with.push(mother);
          mother.has_children_with.push(mother);
        }
      }
    }
  }
}
