// Even though the shaders are coded into the javascript, I have this file so I can get syntax highlighting. Then I just copy+paste to the javascript

// TODO he defines variables differently
struct Material {
    vec3 ambientColor;
    vec3 diffuseColor;
    vec3 specularColor;
    float shininess;
    float Ka;
    float Kd;
    float Ks;
};

uniform mat4 u_ModelMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;
uniform vec4 u_ColorOverride;
uniform bool u_PopOut;
uniform vec3 u_CameraPos;
uniform vec3 u_LightPos;
uniform bool u_ShowNormals;
uniform Material u_Material;

attribute vec4 a_Position;
attribute vec3 a_Color;
attribute vec3 a_Normal;

varying vec4 v_Color;

void getColorFromLighting(vec3 v_Pos, vec3 v_Normal) {
    vec3 lightPos = vec3(0.0, 0.0, 10.0);
    vec3 ambientColor = vec3(0.5, 0.5, 0.5);
    vec3 diffuseColor = vec3(0.5, 0.5, 0.5);
    vec3 specularColor = vec3(1.0, 1.0, 1.0);
    float shininess = 80.0;
    float Ka = 1.0;
    float Kd = 1.0;
    float Ks = 1.0;

    vec3 N = normalize(v_Normal);
    vec3 L = normalize(u_LightPos - v_Pos);

    float diffuse = max(dot(N, L), 0.0);
    float specular = 0.0;
    if (diffuse > 0.0) {
        vec3 R = reflect(-L, N);
        vec3 V = normalize(u_CameraPos - v_Pos);
        float specAngle = max(dot(R, V), 0.0);
        specular = pow(specAngle, u_Material.shininess);
    }

    vec4 lighting = vec4(u_Material.Ka * u_Material.ambientColor + u_Material.Kd * diffuse * u_Material.diffuseColor + u_Material.Ks * specular * u_Material.specularColor, 1.0);

    v_Color = v_Color * lighting;
}

void getColorFromNormal(vec3 v_Normal) {
    vec3 normalColor = normalize(v_Normal) * 0.5 + vec3(0.5, 0.5, 0.5);
    v_Color = vec4(normalColor, 1.0);
    if (all(equal(v_Normal, vec3(0.0, 0.0, 0.0)))) {
        v_Color = vec4(1, 1, 1, 1);
    }
}

void main() {
    vec4 position = u_ModelMatrix * a_Position;
    vec4 normal = normalize(vec4(a_Normal, 0.0));
    vec3 transformedNormal = normalize(vec3(u_NormalMatrix * normal));

    if (u_PopOut) {
        position += 0.03 * vec4(transformedNormal, 0.0);
    }

    gl_Position = u_ProjectionMatrix * position;
    gl_PointSize = 10.0;

    vec4 a_Color4 = vec4(a_Color.r, a_Color.g, a_Color.b, 1.0);

    v_Color = mix(u_ColorOverride, a_Color4, 1.0 - u_ColorOverride.a);
    vec3 v_Pos = vec3(position) / position.w;
    vec3 v_Normal = transformedNormal;

    if (!u_ShowNormals) {
        getColorFromLighting(v_Pos, v_Normal);
    } else {
        getColorFromNormal(v_Normal);
    }
}