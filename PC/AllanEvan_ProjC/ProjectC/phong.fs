// Even though the shaders are coded into the javascript, I have this file so I can get syntax highlighting. Then I just copy+paste to the javascript

precision mediump float;

struct Material {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

struct Light {
    vec3 pos;
    vec3 Ia;
    vec3 Id;
    vec3 Is;
};

uniform vec3 u_CameraPos;
uniform bool u_ShowNormals;
uniform Material u_Material;
uniform Light u_Light;
uniform bool u_BlinnLighting;
uniform bool u_UseVertColors;

varying vec4 v_Color;
varying vec3 v_Pos;
varying vec3 v_Normal;

void getColorFromLighting() {
    vec3 N = normalize(v_Normal);
    vec3 L = normalize(u_Light.pos - v_Pos);

    float diffuse = max(dot(N, L), 0.0);

    float specAngle;
    vec3 V = normalize(u_CameraPos - v_Pos);
    if (u_BlinnLighting) {
        vec3 H = normalize(L + V);
        specAngle = max(dot(N, H), 0.0);
    } else {
        vec3 R = reflect(-L, N);
        specAngle = max(dot(R, V), 0.0);
    }
    float specular = pow(specAngle, u_Material.shininess);

    vec3 albedo;
    if (u_UseVertColors) {
        albedo = v_Color.rgb;
    } else {
        albedo = u_Material.Ka;
    }

    gl_FragColor = vec4(albedo * u_Light.Ia + u_Material.Kd * diffuse * u_Light.Id + u_Material.Ks * specular * u_Light.Is, 1.0);
}

void getColorFromNormals() {
    vec3 normalColor = normalize(v_Normal) * 0.5 + vec3(0.5, 0.5, 0.5);
    vec4 a_Color4 = vec4(normalColor, 1.0);
    if (all(equal(v_Normal, vec3(0.0, 0.0, 0.0)))) {
      a_Color4 = vec4(1, 1, 1, 1);
    }
    gl_FragColor = a_Color4;
}

void main() {
    if (!u_ShowNormals) {
        getColorFromLighting();
    } else {
        getColorFromNormals();
    }
}
