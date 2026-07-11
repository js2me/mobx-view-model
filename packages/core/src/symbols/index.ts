
declare const process: { env: { NODE_ENV?: string } };

export const VIEW_MODEL_MARKER = Symbol.for(process.env.NODE_ENV === 'production' ? '' : '@@__view_model_marker__@@');