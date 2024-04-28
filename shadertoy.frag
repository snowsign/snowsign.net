const float circleRadius = 0.07;
const float falloff = 1.2;

const float PI = 3.1415926538;
const float E = 2.7182818285;

vec2 convertAngle(vec2 mid, float theta, float radius) {
    return vec2(sin(theta) * radius + mid.x, cos(theta) * radius + mid.y);
}

float strength(float d) {
    return min(exp(-20.0 * (d - circleRadius) / falloff),1.0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy/iResolution.xx;
    vec2 mv = iMouse.xy/iResolution.xx;
    vec2 mid = iResolution.xy/iResolution.xx/2.0;
    
    float theta = atan(mv.x - mid.x, mv.y - mid.y);
    float radius = distance(mv, mid);
    
    vec2 c1 = convertAngle(mid, theta, radius);
    vec2 c2 = convertAngle(mid, theta + 2.0 * PI / 3.0, radius);
    vec2 c3 = convertAngle(mid, theta + 4.0 * PI / 3.0, radius);
    
    float s1 = strength(distance(uv, c1));
    float s2 = strength(distance(uv, c2));
    float s3 = strength(distance(uv, c3));
    
    // float sE = (s1 + s2 + s3) - 2.0;
    
    vec3 col = vec3(s1,s2,s3);
    //vec3 col = vec3(1.0-sE);
    
    fragColor = vec4(col,1.0/*-sE*/);
}