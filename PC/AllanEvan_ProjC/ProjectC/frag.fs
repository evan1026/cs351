// Even though the shaders are coded into the javascript, I have this file so I can get syntax highlighting. Then I just copy+paste to the javascript

precision mediump float;
varying vec4 v_Color;
void main() {
  gl_FragColor = v_Color;
}