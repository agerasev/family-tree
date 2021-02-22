import $ = require("jquery");
import toml = require("toml");

import {InName, InPerson, InTree} from "./input";
import inputTI from "./gen/input-ti";
import {createCheckers, func} from "ts-interface-checker";

const checkers = createCheckers(inputTI);

class Name {
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
}

enum Gender {
  Male,
  Female,
}
function makeGender(str: "male" | "female"): Gender {
  switch (str) {
    case "male": {
      return Gender.Male;
    }
    case "female": {
      return Gender.Female;
    }
  }
}

class Person {
  name: Name;
  gender: Gender;
  parents: {
    father: Person | null,
    mother: Person | null,
  };

  constructor(obj: InPerson) {
    checkers.InPerson.strictCheck(obj);
    this.name = new Name(obj.name);
    this.gender = makeGender(obj.gender);
    this.parents = { father: null, mother: null };
  }
}

type Id = string;
const idLength = 32;
const hexChars = "0123456789abcdef";
function readId(str: string): Id {
  if (str.length !== idLength) {
    throw Error(`Bad id length ${str.length}, must be ${idLength}`);
  }
  for (let char of str) {
    if (!hexChars.includes(char)) {
      throw Error(`Unsupported symbol '${char}' in identifier, only following symbols are supported: '${hexChars}'`);
    }
  }
  return str;
}

class Tree {
  version: number[];
  persons: Record<Id, Person>;

  getPerson(id: Id): Person {
    const person = this.persons[id];
    if (person === undefined) {
      throw Error(`Identifier '${id}' does not exist`);
    }
    return person;
  }

  constructor(obj: InTree) {
    checkers.InTree.strictCheck(obj);
    this.version = obj.version.split(".").map(s => parseInt(s));
    this.persons = {};
    for (let person of obj.persons) {
      this.persons[readId(person.id)] = new Person(person);
    }
    for (let person of obj.persons) {
      let id = readId(person.id);
      if (person.parents !== undefined) {
        if (person.parents.father !== undefined) {
          this.persons[id].parents.father = this.getPerson(readId(person.parents.father));
        }
        if (person.parents.mother !== undefined) {
          this.persons[id].parents.mother = this.getPerson(readId(person.parents.mother));
        }
      }
    }
  }
}

$(function () {
  $.get('data/tree.toml', function (tree_toml) {
    let tree = new Tree(toml.parse(tree_toml));
    console.log(tree);
  });
  $(document.body).append('<svg><path d="M 0 0 L 100 100" style="stroke: #000; stroke-width: 5px;" /></svg>');
});
