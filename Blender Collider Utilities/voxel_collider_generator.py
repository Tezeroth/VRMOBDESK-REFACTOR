bl_info = {
    "name": "Voxel Collider Generator",
    "author": "Tezzeroth & ChatGPT",
    "version": (0, 2),
    "blender": (3, 0, 0),
    "location": "View3D > Sidebar > Voxel Collider",
    "description": "Generate PhysX-compatible static colliders using voxel-filled primitives.",
    "category": "Object",
}

import bpy
import bmesh
import mathutils
import numpy as np
from bpy.props import FloatProperty, EnumProperty, BoolProperty, IntProperty
from bpy.types import Operator, Panel, PropertyGroup
from math import ceil
from mathutils import Vector

class VCG_Props(PropertyGroup):
    voxel_size: FloatProperty(
        name="Voxel Size",
        default=0.5,
        min=0.01,
        description="Size of voxel grid units"
    )

    use_boxes: BoolProperty(name="Use Boxes", default=True)
    use_spheres: BoolProperty(name="Use Spheres", default=True)
    use_capsules: BoolProperty(name="Use Capsules", default=False)

    merge_output: BoolProperty(
        name="Merge into Single Mesh",
        default=False,
        description="Seal and merge output primitives into a single mesh (no holes)"
    )

    voxel_resolution: IntProperty(
        name="Resolution Multiplier",
        default=32,
        min=4,
        max=256,
        description="Voxel grid density"
    )

class VoxelGrid:
    def __init__(self, min_corner, max_corner, voxel_size):
        self.min_corner = min_corner
        self.max_corner = max_corner
        self.voxel_size = voxel_size
        self.dims = max_corner - min_corner
        self.grid_size = [ceil(self.dims[i] / voxel_size) for i in range(3)]
        self.grid = np.zeros(self.grid_size, dtype=bool)

    def get_index(self, location):
        relative = (location - self.min_corner) / self.voxel_size
        return tuple(map(int, relative))

    def mark(self, index):
        if all(0 <= idx < dim for idx, dim in zip(index, self.grid_size)):
            self.grid[index] = True

    def is_marked(self, index):
        if all(0 <= idx < dim for idx, dim in zip(index, self.grid_size)):
            return self.grid[index]
        return True

    def iter_empty(self):
        for idx, val in np.ndenumerate(self.grid):
            if not val:
                yield idx

class VCG_OT_Generate(Operator):
    bl_idname = "object.vcg_generate"
    bl_label = "Voxelize and Generate Colliders"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        props = context.scene.vcg_props
        obj = context.active_object

        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object.")
            return {'CANCELLED'}

        self.report({'INFO'}, "Starting voxel-based primitive fitting...")

        bpy.ops.object.mode_set(mode='OBJECT')
        mesh = obj.data
        world_matrix = obj.matrix_world

        # Calculate bounds
        bounds = [world_matrix @ Vector(corner) for corner in obj.bound_box]
        min_corner = Vector(map(min, zip(*bounds)))
        max_corner = Vector(map(max, zip(*bounds)))

        voxel_size = props.voxel_size
        voxel_grid = VoxelGrid(min_corner, max_corner, voxel_size)

        coll_group = bpy.data.collections.get("VCG_Colliders")
        if not coll_group:
            coll_group = bpy.data.collections.new("VCG_Colliders")
            context.scene.collection.children.link(coll_group)

        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.transform(world_matrix)

        # Voxel fill by raycasting (simple approximation for static closed meshes)
        for idx in voxel_grid.iter_empty():
            center = min_corner + Vector(idx) * voxel_size + Vector((0.5, 0.5, 0.5)) * voxel_size
            inside = False
            direction = Vector((1, 0.1, 0.3)).normalized()
            count = 0
            for edge in bm.edges:
                hit = edge.calc_center_median().dot(direction - center)
                if hit > 0:
                    count += 1
            if count % 2 == 1:
                voxel_grid.mark(idx)

        bm.free()

        for idx in voxel_grid.iter_empty():
            continue  # skip unmarked voxels

        for idx, filled in np.ndenumerate(voxel_grid.grid):
            if not filled:
                continue
            center = min_corner + Vector(idx) * voxel_size + Vector((0.5, 0.5, 0.5)) * voxel_size

            if props.use_boxes:
                bpy.ops.mesh.primitive_cube_add(size=voxel_size, location=center)
                cube = context.active_object
                cube.name = f"VCG_Cube_{idx}"
                coll_group.objects.link(cube)
                context.scene.collection.objects.unlink(cube)

        self.report({'INFO'}, "Voxel primitives placed.")
        return {'FINISHED'}

class VCG_PT_Panel(Panel):
    bl_label = "Voxel Collider"
    bl_idname = "OBJECT_PT_voxel_collider"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Voxel Collider'

    def draw(self, context):
        layout = self.layout
        props = context.scene.vcg_props

        layout.prop(props, "voxel_size")
        layout.prop(props, "voxel_resolution")
        layout.label(text="Primitives to Use:")
        layout.prop(props, "use_boxes")
        layout.prop(props, "use_spheres")
        layout.prop(props, "use_capsules")
        layout.prop(props, "merge_output")
        layout.operator("object.vcg_generate")

classes = (VCG_Props, VCG_OT_Generate, VCG_PT_Panel)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.vcg_props = bpy.props.PointerProperty(type=VCG_Props)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.vcg_props

if __name__ == "__main__":
    register()
