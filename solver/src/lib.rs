use std::{
    rc::Rc,
    cell::Cell,
    collections::HashMap,
};
use wasm_bindgen::prelude::*;
use web_sys::console;
use js_sys::{Function as JsFunction};

#[wasm_bindgen]
pub fn greet(name: &str) {
    console::log_1(&format!("Hello, {}!", name).into());
}

pub type JsId = String;

pub struct Elast {
    pub node: f64,
    pub hor: f64,
    pub ver: f64,
    pub hor_inter: f64,
    pub ver_inter: f64,
}

pub const MAX_VEL: f64 = 1.0;

pub const ELAST: Elast = Elast {
    node: 1.0,
    hor: 0.2,
    ver: 0.1,
    hor_inter: 5.0,
    ver_inter: 5.0,
};

struct Node {
    id: JsId,
    pos: Cell<f64>,
    vel: Cell<f64>,
    level: i32,
    callback: JsFunction,
}

impl Node {
    fn apply_force(&self, f: f64) {
        self.vel.set(self.vel.get() + f);
    }
    fn step(&self, dt: f64) {
        self.pos.set(self.pos.get() + self.vel.get().clamp(-MAX_VEL, MAX_VEL) * dt);
        self.vel.set(0.0);
    }
    fn interact(&self, other: &Node, elast: f64) {
        let mut d = self.pos.get() - other.pos.get();
        let l = d.abs();
        let cl = 1.0;
        if l < cl {
            d /= l;
            let f = elast * d * (4.0 * (cl - l)).min(1.0);
            self.apply_force(f);
            other.apply_force(-f);
        }
    }

    pub fn sync(&self) {
        (self.callback).call1(&JsValue::null(), &JsValue::from(self.pos.get())).unwrap();
    }
}

struct HLink {
    id: JsId,
    left: Rc<Node>,
    right: Rc<Node>,
}

struct VLink {
    id: JsId,
    top: Rc<HLink>,
    bottom: Rc<Node>,
}

fn for_each_pair<'a, T: 'a, I, S, F>(seq: &'a S, f: F)
where
    T: 'a,
    I: Iterator<Item=&'a T>,
    &'a S: IntoIterator<Item=&'a T, IntoIter=I>,
    F: Fn(&'a T, &'a T),
{
    for (i, a) in seq.into_iter().enumerate() {
        for b in seq.into_iter().skip(i + 1) {
            f(a, b);
        }
    }
}

#[wasm_bindgen]
pub struct Solver {
    nodes: HashMap<JsId, Rc<Node>>,
    hlinks: HashMap<JsId, Rc<HLink>>,
    vlinks: HashMap<JsId, Rc<VLink>>,

    node_levels: HashMap<i32, Vec<Rc<Node>>>,
    hlink_levels: HashMap<i32, Vec<Rc<HLink>>>,
    vlink_levels: HashMap<i32, Vec<Rc<VLink>>>,
}

#[wasm_bindgen]
impl Solver {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            hlinks: HashMap::new(),
            vlinks: HashMap::new(),

            node_levels: HashMap::new(),
            hlink_levels: HashMap::new(),
            vlink_levels: HashMap::new(),
        }
    }
    pub fn add_node(&mut self, id: JsId, pos: f64, level: i32, callback: JsFunction) {
        let node = Rc::new(Node {
            id: id.clone(),
            pos: Cell::new(pos),
            vel: Cell::new(0.0),
            level,
            callback,
        });
        assert!(self.nodes.insert(id, node.clone()).is_none());
        self.node_levels.entry(level)
            .or_insert_with(Vec::new)
            .push(node);
    }
    pub fn add_hlink(&mut self, id: JsId, left_id: JsId, right_id: JsId) {
        let left = self.nodes[&left_id].clone();
        let right = self.nodes[&right_id].clone();
        let hlink = Rc::new(HLink {
            id: id.clone(),
            left: left.clone(),
            right: right.clone(),
        });
        assert!(self.hlinks.insert(id, hlink.clone()).is_none());
        assert_eq!(left.level, right.level);
        self.hlink_levels.entry(left.level)
            .or_insert_with(Vec::new)
            .push(hlink);
    }
    pub fn add_vlink(&mut self, id: JsId, top_id: JsId, bottom_id: JsId) {
        let top = self.hlinks[&top_id].clone();
        let bottom = self.nodes[&bottom_id].clone();
        let vlink = Rc::new(VLink {
            id: id.clone(),
            top,
            bottom: bottom.clone(),
        });
        assert!(self.vlinks.insert(id, vlink.clone()).is_none());
        self.vlink_levels.entry(bottom.level)
            .or_insert_with(Vec::new)
            .push(vlink);
    }
    pub fn update_node(&mut self, id: JsId, pos: f64) {
        self.nodes[&id].pos.set(pos);
    }

    pub fn step(&self, dt: f64) {
        for nodes in self.node_levels.values() {
            for_each_pair(nodes, |a, b| a.interact(b, ELAST.node));
        }

        for node in self.nodes.values() {
            node.step(dt);
        }
    }
    pub fn sync(&self) {
        for node in self.nodes.values() {
            node.sync();
        }
    }
}
