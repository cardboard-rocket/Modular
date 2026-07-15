import{P as d}from"./prism-okaidia-z7NgJy7m.js";import"./prism-cpp-nxIg4ZzG.js";import{_,c as l,B as c,a as e,F as h,r as y,f as a,o as f,n as v,t as p}from"./index-5qFO5Xkw.js";const u={data(){return{lang:"python",loadExamples:{python:`import ctypes, platform, os

system  = platform.system()
ext     = {"Windows": "dll", "Linux": "so", "Darwin": "dylib"}[system]
lib     = ctypes.CDLL(os.path.join("linked_libraries", f"florasynth.{ext}"))

# Bind a function — set argtypes and restype before calling
lib.florasynth_tree_create.argtypes = [ctypes.c_char_p]
lib.florasynth_tree_create.restype  = ctypes.c_void_p

tree = lib.florasynth_tree_create(b'{"type":"oak"}')`,js:`// Node.js — using the 'ffi-napi' package
import ffi from 'ffi-napi';
import ref from 'ref-napi';

const lib = ffi.Library('./linked_libraries/florasynth', {
    florasynth_tree_create:     ['pointer', ['string']],
    florasynth_simulation_create: ['pointer', []],
    florasynth_simulation_grow: ['void',    ['pointer', 'int', 'pointer']],
    florasynth_free_tree_ptr:   ['void',    ['pointer']],
});

const tree = lib.florasynth_tree_create('{"type":"oak"}');`,cpp:`#include <dlfcn.h>  // Linux / macOS
// #include <windows.h> for Windows — use LoadLibraryA + GetProcAddress

void* lib = dlopen("linked_libraries/florasynth.so", RTLD_LAZY);

typedef void* (*create_tree_fn)(const char*);
create_tree_fn florasynth_tree_create =
    (create_tree_fn)dlsym(lib, "florasynth_tree_create");

void* tree = florasynth_tree_create("{\\"type\\":\\"oak\\"}");`},meshStruct:`// MeshData is returned by florasynth_tree_get_mesh.
// The struct layout is:
struct MeshData {
    float*    vertexData;  // interleaved: x,y,z,nx,ny,nz,u,v (8 floats per vertex)
    uint32_t* indices;
    uint32_t  vertexCount;
    uint32_t  indexCount;
};
// Always call florasynth_free_mesh_data(mesh) when done.`,cHeader:`// All functions use C linkage (extern "C")

// ----- Tree management -----
void*     florasynth_tree_create(const char* properties_json);
void      florasynth_tree_set_properties(void* tree, const char* json);
void      florasynth_tree_set_seed(void* tree, int seed);
void      florasynth_tree_set_starting_position(void* tree, float x, float y, float z);
void      florasynth_tree_set_starting_direction(void* tree, float x, float y, float z, float w);
void      florasynth_tree_init(void* tree);
void      florasynth_tree_clear(void* tree);

// ----- Tree mesh -----
void      florasynth_tree_configure_mesh(void* tree);
MeshData* florasynth_tree_get_mesh(void* tree, const char* mesh_type);
void      florasynth_free_mesh_data(MeshData* mesh);

// ----- Tree memory -----
void      florasynth_free_tree_ptr(void* tree);

// ----- Tree accessors -----
int       florasynth_tree_get_age(void* tree);
int       florasynth_tree_get_seed(void* tree);
int       florasynth_tree_get_simulation_id(void* tree);
void*     get_tree_ptr_from_sim_id(void* sim, int id);

// ----- Simulation -----
void*     florasynth_simulation_create();
void      florasynth_simulation_add_tree(void* sim, void* tree);
void      florasynth_simulation_remove_tree(void* sim, void* tree);
void      florasynth_simulation_grow(void* sim, int years, void (*callback)(int));
void      florasynth_simulation_grow_single(void* sim, void* tree, int years, void (*callback)(int));

// ----- Snapshots -----
uint8_t*  florasynth_create_snapshot(void* sim, size_t* out_size);
void      florasynth_load_snapshot(void* sim, uint8_t* data, size_t size);
void      florasynth_free_snapshot(uint8_t* data);`}},methods:{hl(o,t){const s=d.languages[t];return s?d.highlight(o,s,t):o},langLabel(o){return{python:"Python",js:"JavaScript (Node)"}[o]}},mounted(){d.highlightAll()}},g={class:"docs_container"},m={class:"lang_tabs"},b=["onClick"],L={class:"fn_code"},w=["innerHTML"],k={class:"fn_code"},x=["innerHTML"],C={class:"fn_code"},T=["innerHTML"];function F(o,t,s,A,r,n){return f(),l("div",g,[t[0]||(t[0]=c('<h2 class="title" data-v-d9c6f151>Using the DLL Directly</h2><p class="paragraph" data-v-d9c6f151> All official bindings are thin wrappers around a native shared library that exposes a plain C API. If your language or environment is not covered by an official binding, you can load the library yourself and call the functions directly — the same way every other binding works under the hood. </p><h3 class="heading" data-v-d9c6f151>Where to Find the Libraries</h3><p class="paragraph" data-v-d9c6f151> A <code data-v-d9c6f151>linked_libraries/</code> folder is included at the root of the distribution. It contains pre-built libraries for all three platforms: </p><table class="info_table" data-v-d9c6f151><thead data-v-d9c6f151><tr data-v-d9c6f151><th data-v-d9c6f151>Platform</th><th data-v-d9c6f151>File</th></tr></thead><tbody data-v-d9c6f151><tr data-v-d9c6f151><td data-v-d9c6f151>Windows</td><td data-v-d9c6f151><code data-v-d9c6f151>linked_libraries/florasynth.dll</code></td></tr><tr data-v-d9c6f151><td data-v-d9c6f151>Linux</td><td data-v-d9c6f151><code data-v-d9c6f151>linked_libraries/florasynth.so</code></td></tr><tr data-v-d9c6f151><td data-v-d9c6f151>macOS</td><td data-v-d9c6f151><code data-v-d9c6f151>linked_libraries/florasynth.dylib</code></td></tr></tbody></table><h3 class="heading" data-v-d9c6f151>Loading the Library</h3><p class="paragraph" data-v-d9c6f151> Most languages have a built-in or popular FFI (Foreign Function Interface) mechanism for loading native libraries. Select your language below for a minimal example of how to load Florasynth and bind your first function. </p>',7)),e("div",m,[(f(),l(h,null,y(["python","js","cpp"],i=>e("button",{key:i,class:v(["lang_tab_btn",{active:r.lang===i}]),onClick:D=>r.lang=i},p(n.langLabel(i)),11,b)),64))]),e("pre",L,[e("code",{innerHTML:n.hl(r.loadExamples[r.lang],r.lang==="js"?"javascript":r.lang)},null,8,w)]),t[1]||(t[1]=c('<div class="callout callout_info" data-v-d9c6f151><strong data-v-d9c6f151>Other languages</strong> Any language with a C FFI can load Florasynth. Common options include <code data-v-d9c6f151>Interop.NativeLibrary</code> in C#, <code data-v-d9c6f151>Libffi</code> in Ruby, <code data-v-d9c6f151>cffi</code> in Lua, <code data-v-d9c6f151>LoadLibrary</code> in Rust via the <code data-v-d9c6f151>libloading</code> crate, and Java&#39;s JNI or JNA. </div><h3 class="heading" data-v-d9c6f151>MeshData Struct</h3><p class="paragraph" data-v-d9c6f151> The mesh functions return a pointer to a <code data-v-d9c6f151>MeshData</code> struct. You will need to mirror this layout in your binding in order to read the fields correctly. The struct is 16 bytes on 32-bit targets and 24 bytes on 64-bit targets. </p>',3)),e("pre",k,[e("code",{innerHTML:n.hl(r.meshStruct,"cpp")},null,8,x)]),t[2]||(t[2]=e("h3",{class:"heading"},"C Function Reference",-1)),t[3]||(t[3]=e("p",{class:"paragraph"},[a(" Every exported symbol uses C linkage and plain pointer-sized types — no C++ name mangling, no exceptions, no virtual dispatch. All strings are null-terminated UTF-8. All pointers returned by "),e("code",null,"florasynth_*_create"),a(" or "),e("code",null,"florasynth_tree_get_mesh"),a(" are owned by the caller and must be freed with the corresponding "),e("code",null,"florasynth_free_*"),a(" function. ")],-1)),e("pre",C,[e("code",{innerHTML:n.hl(r.cHeader,"cpp")},null,8,T)]),t[4]||(t[4]=e("div",{class:"callout callout_warning"},[e("strong",null,"Callback convention"),a(" The "),e("code",null,"grow"),a(" and "),e("code",null,"grow_single"),a(" callbacks follow the C calling convention: "),e("code",null,"void (*callback)(int year)"),a(". Pass "),e("code",null,"NULL"),a(" if you do not need per-year notifications. ")],-1))])}const j=_(u,[["render",F],["__scopeId","data-v-d9c6f151"]]);export{j as default};
