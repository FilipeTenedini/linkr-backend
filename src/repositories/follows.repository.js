import db from '../database/connection.js';

export function createFollow(userId, followedId) {
  const query = {
    text: `
      INSERT INTO follows (user_id, followed_id)
      SELECT $1, $2
      WHERE NOT EXISTS (
        SELECT 1
        FROM follows
        WHERE user_id = $1 AND followed_id = $2
      )
    `,
    values: [userId, followedId],
  };

  return db.query(query);
}

export function deleteFollow(userId, followedId) {
  const query = {
    text: `
      DELETE FROM follows
      WHERE user_id = $1
      AND followed_id = $2
    `,
    values: [userId, followedId],
  };

  return db.query(query);
}

export function getFollowings(userId) {
  const query = {
    text: `
    SELECT COUNT(*)::INTEGER AS "followingsCount"
    FROM follows f
    WHERE f.user_id = $1
    GROUP BY f.user_id;
    `,
    values: [userId],
  };

  return db.query(query);
}
