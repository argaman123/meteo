import { LayerExtension } from '@deck.gl/core';

// deck.gl workaround (#10750): hides what sits on the globe's far side. Remove once deck fixes it.
export class GlobeOcclusion extends LayerExtension {
  static override extensionName = 'GlobeOcclusion';

  override getShaders() {
    return {
      inject: {
        'vs:#decl': 'out float globeOcclusion_facing;',
        'vs:DECKGL_FILTER_GL_POSITION': `
  globeOcclusion_facing = project.projectionMode == PROJECTION_MODE_GLOBE
    ? dot(geometry.position.xyz, project.cameraPosition - geometry.position.xyz)
    : 1.0;`,
        'fs:#decl': 'in float globeOcclusion_facing;',
        'fs:DECKGL_FILTER_COLOR': 'if (globeOcclusion_facing < 0.0) discard;',
      },
    };
  }
}
