import _ from "lodash";

export default class TagMapping {

  constructor({ intercomClient, hullClient, ship }) {
    this.ship = ship;
    this.hullClient = hullClient;
    this.intercomClient = intercomClient;

    this.settingKey = "tag_mapping";
    this.mapping = _.get(this.ship, `private_settings[${this.settingKey}]`, {});
    this.originalMapping = _.cloneDeep(this.mapping);
  }

  /**
   * @return Promise
   */
  persist() {
    if (_.isEqual(this.originalMapping, this.mapping)) {
      return Promise.resolve();
    }
    this.ship.private_settings[this.settingKey] = this.mapping;
    return this.hullClient.put(this.ship.id, { private_settings: this.ship.private_settings });
  }

  /**
   * @param {Array} segments array of segments the tags should be sync to
   * @return Promise
   */
  sync(segments = []) {
    const mappedSegments = _.keys(this.mapping).map(id => { return { id }; });
    const newSegments = _.differenceBy(segments, mappedSegments, "id");
    const oldSegments = _.differenceBy(mappedSegments, segments, "id");

    return Promise.map(newSegments, segment => {
      return this.createTag(segment);
    }, { concurrency: 1 })
    .then(() => {
      return Promise.map(oldSegments, segment => {
        return this.deleteTag(segment);
      }, { concurrency: 3 });
    })
    .then(() => this.persist());
  }

  /**
   * Creates new tag for selected segment
   *
   * @param {Object} segment { id, name }
   * @return Promise
   */
  createTag(segment) {
    return this.intercomClient
      .post("/tags")
      .send({
        name: segment.name
      })
      .then(({ body = {} }) => {
        this.mapping[segment.id] = body.id;
        return body;
      });
  }

  /**
   * Deletes tag mapped for provided segment
   *
   * @param {Object} segment { id, name }
   * @return {Promise}
   */
  deleteTag(segment) {
    const tagId = _.get(this.mapping, segment.id);

    if (!tagId) {
      return Promise.resolve();
    }

    return this.intercomClient
      .delete(`/tags/${tagId}`);
  }
}
