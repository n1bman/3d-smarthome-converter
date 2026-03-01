import sys
import os
import bpy

def arg(name):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return None

in_obj = arg("--in")
out_glb = arg("--out")

if not in_obj or not out_glb:
    print("Usage: blender -b --python blender_convert.py -- --in <obj> --out <glb>", file=sys.stderr)
    raise SystemExit(2)

in_obj = os.path.abspath(in_obj)
out_glb = os.path.abspath(out_glb)

bpy.ops.wm.read_factory_settings(use_empty=True)

try:
    bpy.ops.wm.obj_import(filepath=in_obj)
except Exception:
    bpy.ops.import_scene.obj(filepath=in_obj)

mesh_count = sum(1 for o in bpy.data.objects if o.type == "MESH")
if mesh_count == 0:
    print("No meshes imported from OBJ.", file=sys.stderr)
    raise SystemExit(3)

try:
    bpy.ops.file.pack_all()
except Exception:
    pass

os.makedirs(os.path.dirname(out_glb), exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format='GLB',
    export_apply=True,
    export_yup=True,
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT'
)

print(f"OK: exported {out_glb} meshes={mesh_count}")
