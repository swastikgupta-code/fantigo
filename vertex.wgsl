struct VertexOutput
{
    @builtin(position) pos: vec4f,
    @location(0) ndc: vec2f
}
@vertex
fn vert_main(@builtin(vertex_index) index: u32) -> VertexOutput
{
    var positions = array<vec2f,6>(
        vec2f(1,1),
        vec2f(1,-1),
        vec2f(-1,-1),
        vec2f(1,1),
        vec2f(-1,-1),
        vec2f(-1,1)
    );
    var out: VertexOutput;
    out.pos = vec4f(positions[index],0.0,1.0);
    out.ndc = positions[index];
    return out;
}