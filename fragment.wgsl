struct VertexOutput
{
    @builtin(position) pos: vec4f,
    @location(0) ndc: vec2f
}
@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f
{
    var input_uv = input.ndc;
    var col = vec4f(0.5,0.5,0.0,1.0);
    if(abs(input_uv.x)<0.4 && abs(input_uv.y)<0.2)
    {
        col =  vec4f(0.7,0.2,0.3,1.0);
    }
    return col;
}