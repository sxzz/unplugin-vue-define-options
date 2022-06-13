import { createUnplugin } from 'unplugin'
import { createFilter } from '@rollup/pluginutils'
import { transformDefineOptions } from './define-options/transform'
import type { defineComponent } from 'vue'
import type { FilterPattern } from '@rollup/pluginutils'

declare global {
  const defineOptions: typeof defineComponent
}

export interface Options {
  include?: FilterPattern
  exclude?: FilterPattern | undefined
}

export type OptionsResolved = Required<Options>

function resolveOption(options: Options): OptionsResolved {
  return {
    include: options.include || [/\.vue$/, /\.vue\?vue/],
    exclude: options.exclude || undefined,
  }
}

export default createUnplugin<Options>((options = {}) => {
  const opt = resolveOption(options)
  const filter = createFilter(opt.include, opt.exclude)

  const name = 'unplugin-vue-macros'
  return {
    name,
    enforce: 'pre',

    transformInclude(id) {
      return filter(id)
    },

    transform(code, id) {
      try {
        return transformDefineOptions(code, id)
      } catch (err: unknown) {
        this.error(`${name} ${err}`)
      }
    },
  }
})

export { transformDefineOptions as transform }
