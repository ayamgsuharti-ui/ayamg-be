import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = bearer.split(' ')[1].trim();

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  console.log('Received token:', token);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
