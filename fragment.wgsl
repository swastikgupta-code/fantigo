struct VertexOutput
{
    @builtin(position) pos: vec4f,
    @location(0) ndc: vec2f
}
struct Uniforms
{
    aspect: vec2f,
    time: f32,
    delta_time: f32
}
@group(0) @binding(0) var<uniform> u: Uniforms;
@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f
{
    var input_uv = input.ndc*u.aspect;
    var col = background(input_uv);
    var rect_col = vec4f(0.7,0.2,0.3,1.0);
    var flower_col = vec4f(0.3,0.3,0.5,1.0);
    var polygon_col = vec4f(0.3,0.3,0.5,1.0);
    col =  mix(col,rect_col,rectangle(0.8,0.2,0.4,0.1,input_uv));
    col = mix(col,flower_col,flower(vec2f(-0.1,0.2),1.57,5,0.3,input_uv));
    col = mix(col,polygon_col,polygon(vec2f(-0.7,-0.4),1.57,5,0.3,input_uv));
    var p_col = platformer(input_uv);
    col = mix(col,p_col,p_col.a);
    return col;
}
fn background(uv: vec2f) -> vec4f
{
    var b_uv = vec2f(uv.x*0.4,uv.y);
    var black = vec4f(0.0,0.0,0.0,1.0);
    var grape = vec4f(0.349, 0.231, 0.416,1.0);
    var purple = vec4f(0.2745, 0.1569, 0.4039,1.0);
    var galatic = vec4f(0.2275, 0.1216, 0.5412,1.0);
    var t = length(b_uv-vec2f(0.0,-0.5));
    var col = mix(galatic,grape,smoothstep(0.0,0.9,t));
    col = mix(col,black,smoothstep(0.9,2.0,t));
    return col;
}
fn rectangle(x:f32,y:f32,width:f32,height:f32,uv:vec2f) -> f32
{
    if(abs(uv.x-x)<width && abs(uv.y-y)<height)
    {
        return 1.0;
    }
    return 0.0;
}
fn flower(pos:vec2f,rot_angle: f32,n: f32,amp: f32,uv: vec2f) -> f32
{
    var f_uv = rotate(rot_angle,uv-pos);
    var r = length(f_uv);
    var a = atan2(f_uv.x,f_uv.y);
    var f = amp*cos(n*a);
    return 1.0-smoothstep(f-0.005,f+0.005,r);
}
fn polygon(pos: vec2f,rot_angle:f32,n: f32,amp: f32,uv: vec2f) -> f32
{
    var p_uv = rotate(rot_angle,uv-pos);
    var r = length(p_uv);
    var a = atan2(p_uv.x,p_uv.y);
    var angle = 6.28318530718/n;
    var d = cos(floor(0.5+a/angle)*angle-a)*r-amp;
    return 1.0-smoothstep(-0.01,0.01,d);
}
fn rotate(a: f32,uv: vec2f) -> vec2f
{
    var rot: mat2x2f = mat2x2(cos(a),sin(a),-sin(a),cos(a));
    return rot*uv;
}
fn hash(p: vec2f) -> vec2f
{
    var p3 = fract(vec3f(p.xyx)*vec3f(0.1301,0.1030,0.0973));
    p3 += dot(p3,p3.yzx+33.33);
    return fract((p3.xx + p3.yz)*p3.zy);
}
fn noise(p: vec2f) -> f32
{
    var i = floor(p);
    var f = fract(p);
    var u = f*f*(3.0-2.0*f);
    var a = hash(i).x;
    var b = hash(i+vec2f(1.0,0.0)).x;
    var c = hash(i+vec2f(0.0,1.0)).x;
    var d = hash(i+vec2f(1.0,1.0)).x;
    return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
fn voronoi_cracks(p: vec2f) -> vec2f
{
    var cell = floor(p);
    var frac = fract(p);
    var v1 =vec2f(0.0);
    var v2 = vec2f(0,0);
    var min_dis = 1000.0;
    for(var i = -1;i<=1;i++)
    {
        for(var j = -1;j<=1;j++)
        {
            var offset = vec2f(f32(j),f32(i));
            var point = hash(cell+offset);
            var diff = offset + point - frac;
            var dis = dot(diff,diff);
            if(dis<min_dis)
            {
                min_dis = dis;
                v2 = diff;
                v1 = offset;
            }
        }
    }
    var edge_dis = 1000.0;
    for(var i = -1;i<=1;i++)
    {
        for(var j=-1;j<=1;j++)
        {
            var offset = v1+vec2f(f32(i),f32(j));
            let point = hash(cell + offset);
            let diff = offset + point - frac;
            let diff2 = diff - v2;
            if(dot(diff2,diff2)>0.00001)
            {
                edge_dis = min(edge_dis,dot(0.5*(v2+diff),normalize(diff2)));
            }
        }
    }
    return vec2f(length(v2),edge_dis);
}
fn sd_bottom(p: vec2f,cen: vec2f) -> f32
{
    var d = abs(p) - cen;
    return length(max(d,vec2f(0.0))) + min(max(d.x,d.y),0.0);
}
fn sd_top(p: vec2f,width: f32,height: f32,skew: f32) -> f32
{
    var slant = vec2f(skew,height);
    var point = select(p,-p,p.y<0.0);
    var dis_top = point-slant;
    dis_top.x -= clamp(dis_top.x,-width,width);
    var closest = vec2f(dot(dis_top,dis_top),-dis_top.y);
    var cross = point.x*slant.y-slant.x*point.y;
    point = select(point,-point,cross<0.0);
    var dist_side = point - vec2f(width,0.0);
    var t = clamp(dot(dist_side,slant)/dot(slant,slant),-1.0,1.0);
    dist_side -= slant*t;
    var side = vec2f(dot(dist_side,dist_side),height*width-abs(cross));
    closest = min(closest,side);
    return sqrt(closest.x)*sign(-closest.y);
}
fn platformer(uv: vec2f) -> vec4f
{
    var p_uv = uv;
    var half_w = 0.65;
    var wall_half_h = 0.28;
    var tophalf_h = 0.07;
    var skewx = 0.08;
    var wall_center = vec2f(0.0,-tophalf_h);
    var d_wall = sd_bottom(uv-wall_center,vec2f(half_w,wall_half_h));
    var meetup = wall_half_h-tophalf_h;
    var top_cen = vec2f(skewx,wall_half_h);
    var dis_top = sd_top(uv-top_cen,half_w,tophalf_h,skewx);
    var dist = min(dis_top,d_wall);
    var col = vec3f(0.07,0.09,0.08);
    var alpha = 0.0;
    var gap = 0.004;
    if(dist<gap)
    {
        var g_noise1 = noise(uv*14.0);
        var g_noise2 = noise(uv*32.0);
        var g_noise = g_noise1 * 0.7 + g_noise2 * 0.3;
        var grass_dark = vec3f(0.14,0.34,0.05);
        var grass_mid = vec3f(0.28,0.56,0.08);
        var grass_light = vec3f(0.48,0.76,0.14);
        var grass_col = mix(grass_dark,grass_mid,smoothstep(0.2,0.6,g_noise));
        grass_col = mix(grass_col,grass_light,smoothstep(0.6,0.9,g_noise));;
        col = mix(grass_col,col,smoothstep(0.0,gap,dist));
        alpha = 1.0;
        if(dis_top<=0.0)
        {
            var top_uv = vec2f(uv.x,uv.y*2.5)*16.0;
            var top_noise = noise(top_uv)*0.6+noise(top_uv*2.2)*0.4;
            col = mix(grass_mid,grass_light,top_noise);
            var front_edge_dis = uv.y - meetup;
            col += vec3f(0.12,0.16,0.04) * (1.0-smoothstep(0.0,0.025,front_edge_dis));
        }
    }
    return vec4f(col,alpha);
}