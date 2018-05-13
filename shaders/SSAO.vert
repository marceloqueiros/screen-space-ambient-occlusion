#version 330
uniform sampler2D depth_texture;
uniform sampler2D noise_texture;
uniform sampler2D normals;
uniform sampler2D positions;


uniform mat4 CamP;
uniform mat4 CamPI;
uniform mat4 CamV;
uniform mat4 PVM,VM,M;

in vec4 position;
in vec4 texCoord0;

out vec4 texPos;
out vec4 posw;

out Data {
	vec3 normal;
} DataOut;

void main(void) {
	texPos = texCoord0;
	gl_Position = PVM * position;
}
