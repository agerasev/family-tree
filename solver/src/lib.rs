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

pub const MAX_STEP: f64 = 1.0;

pub const ELAST: Elast = Elast {
    node: 2.0,
    hor: 0.5,
    ver: 0.5,
    hor_inter: 5.0,
    ver_inter: 5.0,
};

pub const STAGES: usize = 4;

struct Node {
    pub pos: Cell<f64>,
    pub vel: Cell<f64>,
    level: i32,
    callback: JsFunction,
}

impl Node {
    fn new(pos: f64, level: i32, callback: JsFunction) -> Self {
        Self {
            pos: Cell::new(pos),
            vel: Cell::new(0.0),
            level,
            callback,
        }
    }
    fn apply_force(&self, f: f64) {
        self.vel.set(self.vel.get() + f);
    }
    fn step(&self, dt: f64) {
        self.pos.set(self.pos.get() + (self.vel.get() * dt).clamp(-MAX_STEP, MAX_STEP));
    }
    fn clear(&self) {
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
    nodes: (Rc<Node>, Rc<Node>),
}

impl HLink {
    pub fn new(nodes: (Rc<Node>, Rc<Node>)) -> Self {
        Self { nodes }
    }
    pub fn apply_force(&self, f: f64) {
        self.nodes.0.apply_force(f / 2.0);
        self.nodes.1.apply_force(f / 2.0);
    }
    pub fn act(&self, elast: f64) {
        let d = self.nodes.0.pos.get() - self.nodes.1.pos.get();
        let f = elast * d.clamp(-1.0, 1.0);
        self.nodes.0.apply_force(-f);
        self.nodes.1.apply_force(f);
    }
    pub fn intersect(&self, other: &HLink, elast: f64) {
        if self.has_common_node(other) {
            return;
        }
        let (tc, oc) = (self.center(), other.center());
        let (ts, os) = (self.size(), other.size());
        let mut d = tc - oc;
        let l = d.abs();
        let r = 0.5 * (ts + os) + 1.0;
        if l < r {
            d /= l;
            let f = elast * d * (r - l);
            let (this_node, other_node) = if d > 0.0 {
                (self.nodes_sorted().0, other.nodes_sorted().1)
            } else {
                (self.nodes_sorted().1, other.nodes_sorted().0)
            };
            this_node.apply_force(f);
            other_node.apply_force(-f);
        }
    }
    pub fn has_common_node(&self, other: &HLink) -> bool {
        Rc::ptr_eq(&self.nodes.0, &other.nodes.0) ||
        Rc::ptr_eq(&self.nodes.0, &other.nodes.1) ||
        Rc::ptr_eq(&self.nodes.1, &other.nodes.0) ||
        Rc::ptr_eq(&self.nodes.1, &other.nodes.1)
    }
    pub fn nodes_sorted(&self) -> (Rc<Node>, Rc<Node>) {
        if self.nodes.0.pos.get() <= self.nodes.1.pos.get() {
            (self.nodes.0.clone(), self.nodes.1.clone())
        } else {
            (self.nodes.1.clone(), self.nodes.0.clone())
        }
    }
    pub fn size(&self) -> f64 {
        (self.nodes.0.pos.get() - self.nodes.1.pos.get()).abs()
    }
    pub fn center(&self) -> f64 {
        0.5 * (self.nodes.0.pos.get() + self.nodes.1.pos.get())
    }
}

struct VLink {
    top: Rc<HLink>,
    bottom: Rc<Node>,
}

impl VLink {
    pub fn new(top: Rc<HLink>, bottom: Rc<Node>) -> Self {
        VLink { top, bottom }
    }
    pub fn act(&self, elast: f64) {
        let d = self.bottom.pos.get() - self.top.center();
        let f = elast * d;
        self.top.apply_force(f);
        self.bottom.apply_force(-f);
    }
    pub fn intersect(&self, other: &VLink, elast: f64) {
        if Rc::ptr_eq(&self.top, &other.top) {
            return;
        }
        let (left, right) = if self.top.center() < other.top.center() {
            (self, other)
        } else {
            (other, self)
        };
        let d = left.bottom.pos.get() - right.bottom.pos.get();
        if d > -1.0 {
            let f = elast * (d + 1.0).clamp(-1.0, 1.0);
            left.bottom.apply_force(-f);
            right.bottom.apply_force(f);
        }
    }
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

struct Rk4 {
    pub pos: f64,
    pub vels: [f64; 4],
}

impl Default for Rk4 {
    fn default() -> Self {
        Self {
            pos: 0.0,
            vels: [0.0; 4],
        }
    }
}

impl Default for Solver {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
pub struct Solver {
    nodes: HashMap<JsId, (Rc<Node>, Rk4)>,
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
        let node = Rc::new(Node::new(pos, level, callback));
        assert!(self.nodes.insert(id, (node.clone(), Rk4::default())).is_none());
        self.node_levels
            .entry(level)
            .or_insert_with(Vec::new)
            .push(node);
    }
    pub fn add_hlink(&mut self, id: JsId, left_id: JsId, right_id: JsId) {
        let left = self.nodes[&left_id].0.clone();
        let right = self.nodes[&right_id].0.clone();
        let hlink = Rc::new(HLink::new((left.clone(), right.clone())));
        assert!(self.hlinks.insert(id, hlink.clone()).is_none());
        assert_eq!(left.level, right.level);
        self.hlink_levels
            .entry(left.level)
            .or_insert_with(Vec::new)
            .push(hlink);
    }
    pub fn add_vlink(&mut self, id: JsId, top_id: JsId, bottom_id: JsId) {
        let top = self.hlinks[&top_id].clone();
        let bottom = self.nodes[&bottom_id].0.clone();
        let vlink = Rc::new(VLink::new(top, bottom.clone()));
        assert!(self.vlinks.insert(id, vlink.clone()).is_none());
        self.vlink_levels
            .entry(bottom.level)
            .or_insert_with(Vec::new)
            .push(vlink);
    }
    pub fn update_node(&mut self, id: JsId, pos: f64) {
        self.nodes[&id].0.pos.set(pos);
    }

    pub fn compute(&mut self) {
        for node in self.nodes.values() {
            node.0.clear();
        }

        for nodes in self.node_levels.values() {
            for_each_pair(nodes, |a, b| a.interact(b, ELAST.node));
        }
        for hlink in self.hlinks.values() {
            hlink.act(ELAST.hor);
        }
        for vlink in self.vlinks.values() {
            vlink.act(ELAST.ver);
        }
        for hlinks in self.hlink_levels.values() {
            for_each_pair(hlinks, |a, b| a.intersect(b, ELAST.hor_inter));
        }
        for vlinks in self.vlink_levels.values() {
            for_each_pair(vlinks, |a, b| a.intersect(b, ELAST.ver_inter));
        }
    }
    pub fn step(&mut self, dt: f64) {
        for node in self.nodes.values() {
            node.0.step(dt);
        }
    }

    pub fn solve(&mut self, dt: f64) {
        // Runge-Kutta 4 method
        self.nodes.values_mut().for_each(|(node, rk4)| rk4.pos = node.pos.get());
        
        // Step 1
        self.compute();
        self.nodes.values_mut().for_each(|(node, rk4)| rk4.vels[0] = node.vel.get());

        // Step 2
        self.step(dt / 2.0);
        self.compute();
        self.nodes.values_mut().for_each(|(node, rk4)| rk4.vels[1] = node.vel.get());

        // Step 3
        self.nodes.values_mut().for_each(|(node, rk4)| node.pos.set(rk4.pos));
        self.step(dt / 2.0);
        self.compute();
        self.nodes.values_mut().for_each(|(node, rk4)| rk4.vels[2] = node.vel.get());

        // Step 4
        self.nodes.values_mut().for_each(|(node, rk4)| node.pos.set(rk4.pos));
        self.step(dt);
        self.compute();
        self.nodes.values_mut().for_each(|(node, rk4)| rk4.vels[3] = node.vel.get());

        // Sum up
        self.nodes.values_mut().for_each(|(node, rk4)| {
            node.pos.set(rk4.pos);
            node.vel.set((
                rk4.vels[0] +
                2.0 * rk4.vels[1] +
                2.0 * rk4.vels[2] +
                rk4.vels[3]
            ) / 6.0);
        });
        self.step(dt);
    }

    pub fn sync(&self) {
        for node in self.nodes.values() {
            node.0.sync();
        }
    }
}
