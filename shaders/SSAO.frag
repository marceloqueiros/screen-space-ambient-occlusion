#version 330

#define SAMPLES 1

uniform sampler2D depth_texture;
uniform sampler2D noise_texture;
uniform sampler2D normals;
uniform sampler2D positions;


uniform mat4 CamP;
uniform mat4 CamPI;
uniform mat4 CamV;
uniform mat4 P;
uniform mat4 VM;
uniform mat4 PVM;

uniform vec2 resolution;

const int MAX_KERNEL_SIZE = 64;
const int noiseSize=64;

in vec4 texPos;
in vec4 posw;

layout (location = 0) out vec4 occMap;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main(void) {

	vec4 pos = texture(positions, texPos.xy);
	vec4 depth = texture(depth_texture, texPos.xy);
	vec3 normal =  normalize(texture(normals,texPos.xy).xyz);

	//test if background
	float z = depth.x * 2.0 - 1.0;
	if (z == 1.0) discard;
	
	//random rotation vector
	//noise texture is tiled all over the screen by dividing screen size by texture size
	vec3 rvec = texture(noise_texture, texPos.xy*(resolution.x/64,resolution.y/64)).xyz;

	// gram-schmidt
	vec3 tangent = normalize(rvec - normal * dot(rvec, normal));
	vec3 bitangent = cross(normal, tangent);
	mat3 tbn = mat3(tangent, bitangent, normal);

	vec4 offset;
	vec3 sample;
	float sample_depth;
	float occlusion = 0.0;

	//Sample Kernel

	vec3 random_kernel[MAX_KERNEL_SIZE];
	float kernel_radius=20;
	float ssao_power=2;

	for (int i = 0; i < MAX_KERNEL_SIZE; ++i) {
		vec2 seed=vec2(i,MAX_KERNEL_SIZE);

		random_kernel[i] = vec3(
		rand(seed)*2.0-1.0, //varies between -1 and 1
		rand(seed)*2.0-1.0, //varies between -1 and 1
		(rand(seed))); //varies between 0 and 1, otherwise if we had between -1 and 1, we'd have a sphere kernel

		random_kernel[i]=normalize(random_kernel[i]);
		
		// distribute within hemisphere
		random_kernel[i] *= rand(seed);

		//accelerating interpolation applied to distribution
		float scale = float(i) / float(MAX_KERNEL_SIZE);
		scale = mix(0.1f, 1.0f, scale * scale);
		random_kernel[i] *= scale;
	}





	for (int i=0; i < MAX_KERNEL_SIZE; ++i){

		// from tangent to view space position
		sample = (tbn * random_kernel[i]) * kernel_radius;
		sample = sample + pos.xyz;
		float generatedDepth=sample.z;

		// From view space to screen space
		offset = vec4(sample, 1.0);
		offset = CamP * offset; // In the range -w, w
		offset.xyz /= offset.w; // in the range -1, 1
		offset.xyz = offset.xyz * 0.5 + 0.5;

		// depth at sample's position
		sample_depth = texture(depth_texture, offset.xy).r;

		//back to view space
	    vec4 VSsample = vec4(offset.xy, sample_depth, 1.0); // range 0, 1
	    VSsample.xyz = VSsample.xyz * 2.0 - 1.0;
	    VSsample = CamPI * VSsample;
	    VSsample /= VSsample.w;
	    float actualDepth=VSsample.z;

		float rangeCheck= abs(pos.z - actualDepth) < kernel_radius ? 1.0 : 0.0;
		occlusion += (actualDepth >= generatedDepth ? 1.0 : 0.0)* rangeCheck; 
	}

	occlusion = 1-(occlusion / float(MAX_KERNEL_SIZE));
	occlusion = pow(occlusion, ssao_power);
	occMap = vec4(occlusion);
	
}