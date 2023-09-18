export type Maybe<T> =
  | {
      ok: true;
      t: T;
    }
  | {
      ok: false;
    };
