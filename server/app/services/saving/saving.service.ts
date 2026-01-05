import { Map, MapDocument } from "@app/model/schema/map.schema";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class SavingService {
  constructor(@InjectModel(Map.name) private mapModel: Model<MapDocument>) {}

  async addMapToDb(mapToAdd: Partial<Map>): Promise<Map | null> {
    try {
      const existsAlready = await this.mapModel.find({ name: mapToAdd.name });

      if (existsAlready.length > 0) {
        console.log(`Map with name "${mapToAdd.name}" already exists`);
        return null;
      }

      const newMap = await this.mapModel.create(mapToAdd);
      return await newMap.save();
    } catch (error) {
      console.log("Error adding map to database:", error);
      throw error; // Re-throw pour que le controller puisse gérer l'erreur
    }
  }

  async replaceMapInDb(mapToAdd: Partial<Map>): Promise<Map | null> {
    return await this.mapModel.findOneAndReplace(
      { _id: mapToAdd._id },
      mapToAdd,
      { upsert: true }
    );
  }
}
