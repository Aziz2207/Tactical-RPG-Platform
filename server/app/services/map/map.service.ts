import { Map, MapDocument } from "@app/model/schema/map.schema";
import { GameState } from "@common/constants";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class MapService {
  constructor(@InjectModel(Map.name) private mapModel: Model<MapDocument>) {}

  async getUserEditableMaps(uid: string): Promise<Map[]> {
    const userMaps = await this.getMapsOwnedByUser(uid);
    const editableMaps = (await this.getEditableMaps()).filter(
      (map) => map.creatorId !== uid
    );
    return [...userMaps, ...editableMaps];
  }

  async getUserPlayableMaps(uid: string): Promise<Map[]> {
    const userMaps = await this.getMapsOwnedByUser(uid);
    const playableMaps = (await this.getPlayableMaps()).filter(
      (map) => map.creatorId !== uid
    );
    return [...userMaps, ...playableMaps];
  }
  async getMapsOwnedByUser(uid: string): Promise<Map[]> {
    return await this.mapModel.find({ creatorId: uid });
  }

  private async getPlayableMaps(): Promise<Map[]> {
    return await this.mapModel.find({
      state: { $in: [GameState.Public, GameState.Shared] },
    });
  }

  private async getEditableMaps(): Promise<Map[]> {
    return await this.mapModel.find({ state: GameState.Public });
  }

  async duplicateMap(
    newCreatorId: string,
    newCreatorUsername: string,
    mapId: string
  ): Promise<Map | null> {
    const map = await this.mapModel.findById(mapId);
    if (!map) {
      return null;
    }
    const mapData = map.toObject ? map.toObject() : map;
    const newMapName = await this.nextAvailableName(`${map.name}_copie`);
    if (newMapName.length > 40) {
      throw new Error(
        "Impossible de dupliquer la carte : le nom de la copie est trop long"
      );
    }
    delete mapData._id; // Supprimer l'_id
    return await this.mapModel.create({
      ...mapData,
      name: newMapName,
      state: GameState.Private,
      creatorId: newCreatorId,
      creatorUsername: newCreatorUsername,
      lastModification: new Date(),
    });
  }

  private async nextAvailableName(name: string): Promise<string> {
    let counter = 2;
    let candidateName = name;

    while (await this.mapModel.exists({ name: candidateName })) {
      candidateName = `${name}_${counter}`;
      counter++;
    }

    return candidateName;
  }

  async updateMap(id: string, updateData: Partial<Map>): Promise<Map | null> {
    const map = await this.mapModel.findById(id);
    if (!map) {
      return null;
    }
    Object.assign(map, updateData);
    return await map.save();
  }

  async deleteMap(id: string): Promise<boolean> {
    const result = await this.mapModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  async updateCreatorUsername(
    uid: string,
    newCreatorUsername: string
  ): Promise<void> {
    await this.mapModel.updateMany(
      { creatorId: uid },
      { $set: { creatorUsername: newCreatorUsername } }
    );
  }
}
