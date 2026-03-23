import {
  createDuckDbSlice,
  createWasmDuckDbConnector,
  type DuckDbSliceState,
} from '@sqlrooms/duckdb';
import {
  createRoomSlice,
  createRoomStore,
  type BaseRoomStoreState,
} from '@sqlrooms/room-store';

export type RoomState = BaseRoomStoreState & DuckDbSliceState;

const connector = createWasmDuckDbConnector({
  initializationQuery: `
    INSTALL httpfs;
    LOAD httpfs;
    SET max_expression_depth TO 20;
  `,
});

export const {roomStore, useRoomStore} = createRoomStore<RoomState>((set, get, store) => ({
  ...createRoomSlice()(set, get, store),
  ...createDuckDbSlice({connector})(set, get, store),
}));
