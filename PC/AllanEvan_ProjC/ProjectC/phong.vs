// Even though the shaders are coded into the javascript, I have this file so I can get syntax highlighting. Then I just copy+paste to the javascript

uniform mat4 u_ModelMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;
uniform bool u_PopOut;
uniform float u_WorldStretch;
uniform float u_WorldStretchPhase;

attribute vec4 a_Position;
attribute vec3 a_Color;
attribute vec3 a_Normal;

varying vec4 v_Color;
varying vec3 v_Pos;
varying vec3 v_Normal;

void main() {
    vec4 position = u_ModelMatrix * a_Position;
    vec4 normal = normalize(vec4(a_Normal, 0.0));
    vec3 transformedNormal = normalize(vec3(u_NormalMatrix * normal));

    if (u_PopOut) {
        position += 0.03 * vec4(transformedNormal, 0.0);
    }
    position += u_WorldStretch * vec4(0, 0, sin(position.x + u_WorldStretchPhase) + sin(position.y), 0);

    gl_Position = u_ProjectionMatrix * position;
    gl_PointSize = 10.0;

    v_Color = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);
    v_Pos = vec3(position) / position.w;
    v_Normal = transformedNormal;
}